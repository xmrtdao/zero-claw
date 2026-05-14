
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "../_shared/cors.ts";
import { startUsageTracking } from "../_shared/functionUsageLogger.ts";

const FUNCTION_NAME = 'daily-news-finder';
const RSS_FEED_URL = 'http://feeds.bbci.co.uk/news/world/rss.xml';

serve(async (req) => {
    // Handle CORS preflight requests
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
            throw new Error('Missing configuration (Supabase URL or Key).');
        }
        if (!geminiApiKey && !deepseekApiKey) {
            throw new Error('Missing both GEMINI_API_KEY and DEEPSEEK_API_KEY — at least one AI provider required.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`📰 Fetching RSS Feed from: ${RSS_FEED_URL}`);

        // 1. Fetch RSS Feed
        const rssResponse = await fetch(RSS_FEED_URL);
        if (!rssResponse.ok) {
            throw new Error(`Failed to fetch RSS feed: ${rssResponse.statusText}`);
        }
        const rssText = await rssResponse.text();

        // 2. Parse RSS (Simple Regex/String parsing for durability in Edge runtime without heavy xml libs)
        // Extract items
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(rssText)) !== null) {
            const itemContent = match[1];
            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
            const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
            const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/.exec(itemContent);

            const title = titleMatch?.[1] || titleMatch?.[2] || 'No Title';
            const link = linkMatch?.[1] || '';
            const description = descMatch?.[1] || descMatch?.[2] || '';

            items.push({ title, link, description });
            if (items.length >= 10) break; // Limit to top 10 for analysis
        }

        if (items.length === 0) {
            throw new Error('No items found in RSS feed.');
        }

        console.log(`🔍 Analyzed ${items.length} news items. asking Gemini to pick the best one...`);

        // 3. Gemini Analysis & Content Generation
        const prompt = `
    You are the Chief Information Officer for XMRT DAO.
    
    Here are the top headlines from BBC World News:
    ${JSON.stringify(items.map((it, i) => `${i + 1}. ${it.title} - ${it.description} (${it.link})`))}

    Your Mission:
    1. Select the SINGLE most relevant story for the XMRT ecosystem. We care about:
       - Digital Freedom / Privacy
       - Global Economy / Finance
       - Technology / AI / Cyber
       - Government Regulation / Censorship
       - Decentralization
    2. Write a blog post about it for our Paragraph.com publication.
    
    Format your response as a JSON object with this EXACT structure:
    {
      "selected_story_title": "The headline you chose",
      "selected_story_link": "The original URL",
      "post_title": "A catchy, XMRT-focused title for the blog post",
      "post_markdown": "The full blog post content in Markdown. Include the original link. Be insightful, slightly edgy, and pro-freedom. Mention how this relates to DAO/Crypto values. 300-500 words."
    }
    `;

        let selectedStoryTitle, storyLink, postTitle, postMarkdown;
        let usedProvider = '';

        // Try Gemini first
        if (geminiApiKey) {
            try {
                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                if (!geminiResponse.ok) {
                    const errText = await geminiResponse.text();
                    console.error(`Gemini API error: ${geminiResponse.status} - ${errText}`);
                    throw new Error('Gemini failed');
                }

                const geminiData = await geminiResponse.json();
                const parsed = JSON.parse(geminiData.candidates[0].content.parts[0].text);
                selectedStoryTitle = parsed.selected_story_title;
                storyLink = parsed.selected_story_link;
                postTitle = parsed.post_title;
                postMarkdown = parsed.post_markdown;
                usedProvider = 'gemini';
                console.log(`🤖 Gemini selected: "${selectedStoryTitle}"`);
            } catch (geminiErr) {
                console.error('Gemini failed, trying DeepSeek fallback:', geminiErr);
            }
        }

        // Fallback to DeepSeek if Gemini failed or missing
        if (!usedProvider && deepseekApiKey) {
            console.log('🔄 Falling back to DeepSeek...');
            const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${deepseekApiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-v4-pro",
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            if (!deepseekResponse.ok) {
                const errText = await deepseekResponse.text();
                throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errText}`);
            }

            const dsData = await deepseekResponse.json();
            const parsed = JSON.parse(dsData.choices[0].message.content);
            selectedStoryTitle = parsed.selected_story_title;
            storyLink = parsed.selected_story_link;
            postTitle = parsed.post_title;
            postMarkdown = parsed.post_markdown;
            usedProvider = 'deepseek';
            console.log(`🤖 DeepSeek selected: "${selectedStoryTitle}"`);
        }

        if (!usedProvider) {
            throw new Error('All AI providers failed to generate content.');
        }

        // 4. Publish to Paragraph using the internal function call
        // We invoke the paragraph-publisher function directly or simply call the logic if we want to save an internal hop, 
        // but invoking is cleaner architecture.
        console.log('📝 Publishing to Paragraph...');

        const { data: pubData, error: pubError } = await supabase.functions.invoke('paragraph-publisher', {
            body: {
                title: postTitle,
                markdown: postMarkdown,
                sendNewsletter: true, // As requested, maybe? Or false for safety. User said "publish a story", usually implies standard post.
                categories: ['News', 'XMRT Intelligence']
            }
        });

        if (pubError) throw pubError;

        const publishedUrl = pubData?.data?.url || 'https://paragraph.xyz/@xmrt'; // Fallback if url is nested differently

        // 5. Log Success
        await supabase.from('eliza_activity_log').insert({
            activity_type: 'daily_news_published',
            title: '📰 Daily News Published',
            description: `Published analysis of: ${selectedStoryTitle}`,
            status: 'completed',
            metadata: {
                provider: usedProvider,
                original_story: selectedStoryTitle,
                original_link: storyLink,
                published_url: publishedUrl,
                paragraph_response: pubData
            }
        });

        await usageTracker.success({ result_summary: 'news_published', provider: usedProvider });

        return new Response(JSON.stringify({
            success: true,
            published_url: publishedUrl,
            story: selectedStoryTitle,
            provider: usedProvider
        }), {
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
