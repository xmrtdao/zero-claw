
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "../_shared/cors.ts";
import { startUsageTracking } from "../_shared/functionUsageLogger.ts";

const FUNCTION_NAME = 'share-latest-news';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const usageTracker = startUsageTracking(FUNCTION_NAME, 'gemini', { method: req.method });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration.');
        }
        if (!geminiApiKey && !deepseekApiKey) {
            throw new Error('Missing both GEMINI_API_KEY and DEEPSEEK_API_KEY — at least one AI provider required.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Find latest news Post
        console.log('🔍 Finding latest news post...');
        const { data: activity, error: actError } = await supabase
            .from('eliza_activity_log')
            .select('*')
            .eq('activity_type', 'daily_news_published')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (actError || !activity) {
            throw new Error('No recent news publication found to share.');
        }

        // Check recency (e.g., within last hour? or just allow latest)
        // User asked for sequence: 10:00 publish, 10:05 share. So latest is fine.

        const newsUrl = activity.metadata?.published_url;
        const newsTitle = activity.metadata?.original_story || 'Global News';

        if (!newsUrl) {
            throw new Error('Latest activity log missing published_url metadata.');
        }

        console.log(`Found story: ${newsTitle} (${newsUrl})`);

        // 2. Draft Tweet with Gemini
        const prompt = `
    You are the Social Media Manager for XMRT DAO.
    
    We just published a blog post about: "${newsTitle}"
    Link: ${newsUrl}
    
    Draft a tweet (X post) about this.
    - Be engaging, slightly provocative but smart.
    - Mention it's a fresh ecosystem update.
    - INCLUDE THE LINK.
    - Use 1-2 relevant hashtags (e.g. #XMRT #Privacy #News).
    - Max 280 chars.
    
    Return ONLY the tweet text.
    `;

        let tweetText;
        let usedProvider = '';

        // Try Gemini first
        if (geminiApiKey) {
            try {
                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (!geminiResponse.ok) {
                    const errText = await geminiResponse.text();
                    console.error(`Gemini API error: ${geminiResponse.status} - ${errText}`);
                    throw new Error('Gemini failed');
                }

                const geminiData = await geminiResponse.json();
                tweetText = geminiData.candidates[0].content.parts[0].text.trim();
                usedProvider = 'gemini';
                console.log(`🐦 Gemini Draft: ${tweetText}`);
            } catch (geminiErr) {
                console.error('Gemini failed, trying DeepSeek fallback:', geminiErr);
            }
        }

        // Fallback to DeepSeek
        if (!usedProvider && deepseekApiKey) {
            console.log('🔄 Falling back to DeepSeek for tweet generation...');
            const dsResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${deepseekApiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-v4-pro",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 300
                })
            });

            if (!dsResponse.ok) {
                const errText = await dsResponse.text();
                throw new Error(`DeepSeek API error: ${dsResponse.status} - ${errText}`);
            }

            const dsData = await dsResponse.json();
            tweetText = dsData.choices[0].message.content.trim();
            usedProvider = 'deepseek';
            console.log(`🐦 DeepSeek Draft: ${tweetText}`);
        }

        if (!usedProvider) {
            throw new Error('All AI providers failed to generate tweet.');
        }

        // 3. Create Draft in Typefully
        // We need 'social_set_id' for Typefully. 
        // Assuming we fetch the default one or user needs to config.
        // For now, let's look up a default set or list them if needed?
        // Optimization: Just ask 'typefully-integration' to list sets and pick first if not hardcoded.
        // Ideally, we'd store specific config, but I'll try to fetch sets dynamically.

        console.log('📂 Fetching Social Sets...');
        const { data: typefullySets } = await supabase.functions.invoke('typefully-integration', {
            body: { action: 'list-social-sets' }
        });

        // Check if we got sets structure: { data: [{id: ...}] } or similar
        // Typefully API response: { data: [ ... ] }
        const socialSetId = typefullySets?.data?.[0]?.id;

        if (!socialSetId) {
            throw new Error('Could not find a Typefully Social Set ID to create draft.');
        }

        console.log(`📝 Creating draft in set: ${socialSetId}`);

        const { data: draftData, error: draftError } = await supabase.functions.invoke('typefully-integration', {
            body: {
                action: 'create-draft',
                social_set_id: socialSetId,
                content: tweetText,
                schedule_date: 'next-free-slot' // or 'now' or omit for purely draft
            }
        });

        if (draftError) throw draftError;

        // 4. Log Success
        await supabase.from('eliza_activity_log').insert({
            activity_type: 'social_content_drafted',
            title: '🐦 Tweet Drafted',
            description: `Drafted tweet for news story: ${newsTitle}`,
            status: 'completed',
            metadata: {
                tweet_text: tweetText,
                news_url: newsUrl,
                typefully_draft_id: draftData?.data?.id
            }
        });

        await usageTracker.success({ result_summary: 'tweet_drafted', provider: usedProvider });

        return new Response(JSON.stringify({ success: true, draft_text: tweetText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Function Error:', error);
        await usageTracker.failure(error.message, 500);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
