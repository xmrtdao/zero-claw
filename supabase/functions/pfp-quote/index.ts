/**
 * pfp-quote v1.0 — Party Favor Photo Quote Generator
 *
 * Generates itemized quotes with package options and Stripe payment links.
 * JWT verification: disabled.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PACKAGES = {
  'StudioStation-2': {
    name: 'StudioStation Photo Booth - 2hr',
    base_price: 498,
    duration: '2 hours',
    includes: [
      'Professional DSLR camera & studio strobe lighting',
      'Glamorous sequin backdrop (choice of color)',
      'Unlimited custom 2x6 prints',
      'QR code photo sharing',
      'Goofy props collection',
      'Professional attendant',
      '1-hour free setup',
      'Custom event branding on prints',
    ],
    addons: [
      { id: 'extra_hour', name: 'Additional Hour', price: 199 },
      { id: 'guest_book', name: 'Photo Guest Book', price: 75 },
      { id: '4x6_prints', name: 'Upgrade to 4x6 Prints', price: 99 },
      { id: 'green_screen', name: 'Green Screen Backdrop', price: 0 },
      { id: 'social_station', name: 'Social Media Sharing Station', price: 150 },
    ],
    stripe_link: 'https://buy.stripe.com/8x25kD7ezg6h4iC15YbZe03',
  },
  'StudioStation-4': {
    name: 'StudioStation Photo Booth - 4hr',
    base_price: 996,
    duration: '4 hours',
    includes: [
      'Professional DSLR camera & studio strobe lighting',
      'Glamorous sequin backdrop (choice of color)',
      'Unlimited custom 2x6 prints',
      'QR code photo sharing',
      'Goofy props collection',
      'Professional attendant',
      '1-hour free setup',
      'Custom event branding on prints',
    ],
    addons: [
      { id: 'extra_hour', name: 'Additional Hour', price: 199 },
      { id: 'guest_book', name: 'Photo Guest Book', price: 75 },
      { id: '4x6_prints', name: 'Upgrade to 4x6 Prints', price: 99 },
      { id: 'green_screen', name: 'Green Screen Backdrop', price: 0 },
      { id: 'social_station', name: 'Social Media Sharing Station', price: 150 },
    ],
    stripe_link: 'https://buy.stripe.com/eVqcN556r4nz16qeWObZe04',
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, booking_id, package_name, duration_hours, addons, client_email } = await req.json();

    // ── GENERATE QUOTE ──────────────────────────────────────────
    if (action === 'generate') {
      const pkgKey = `${package_name}-${duration_hours}`;
      const pkg = PACKAGES[pkgKey];
      
      if (!pkg) {
        return new Response(JSON.stringify({
          status: 'error',
          message: `Unknown package: ${pkgKey}. Available: ${Object.keys(PACKAGES).join(', ')}`,
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const selectedAddons = (addons || []).map(id => pkg.addons.find(a => a.id === id)).filter(Boolean);
      const addonTotal = selectedAddons.reduce((sum, a) => sum + (a?.price || 0), 0);
      const total = pkg.base_price + addonTotal;

      const quote = {
        package: pkg.name,
        duration: pkg.duration,
        base_price: pkg.base_price,
        addons: selectedAddons,
        addon_total: addonTotal,
        total: total,
        deposit_required: Math.round(total * 0.5),
        balance_due: total - Math.round(total * 0.5),
        includes: pkg.includes,
        stripe_link: pkg.stripe_link,
        generated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_terms: '50% deposit to secure date. Balance due 14 days before event.',
      };

      // Try to store in Supabase
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (SUPABASE_URL && SUPABASE_KEY && booking_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await supabase.from('bookings').update({
          total_price: total,
          addons: selectedAddons,
          status: 'quoted',
        }).eq('id', booking_id);
      }

      return new Response(JSON.stringify({
        status: 'quote_generated',
        quote,
        payment_link: pkg.stripe_link,
        message: `Quote for ${pkg.name}: $${total}. 50% deposit ($${quote.deposit_required}) secures your date.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── SEND QUOTE VIA EMAIL ────────────────────────────────────
    if (action === 'send' && client_email) {
      // Build a minimal quote response
      return new Response(JSON.stringify({
        status: 'send_instruction',
        message: `To send quote, POST to resend-email with to:${client_email} and the quote body as text.`,
        quote_endpoint: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/pfp-booking',
        example_payload: { action: 'generate', package_name: 'StudioStation', duration_hours: 2 },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── LIST PACKAGES ───────────────────────────────────────────
    if (action === 'packages') {
      return new Response(JSON.stringify({
        status: 'ok',
        packages: Object.entries(PACKAGES).map(([key, pkg]) => ({
          id: key,
          name: pkg.name,
          base_price: pkg.base_price,
          duration: pkg.duration,
          addons: pkg.addons,
        })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
