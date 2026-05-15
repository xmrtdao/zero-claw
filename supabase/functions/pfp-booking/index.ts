/**
 * pfp-booking v1.0 — Party Favor Photo Booking System
 *
 * Manages bookings, sends Stripe payment links, tracks lead status.
 * JWT verification: disabled — accessible from website and relay.
 *
 * Stripe Products (created by Joe):
 *   2hr StudioStation: https://buy.stripe.com/8x25kD7ezg6h4iC15YbZe03 ($498)
 *   4hr StudioStation: https://buy.stripe.com/eVqcN556r4nz16qeWObZe04 ($996)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_LINKS = {
  'StudioStation-2': 'https://buy.stripe.com/8x25kD7ezg6h4iC15YbZe03',
  'StudioStation-4': 'https://buy.stripe.com/eVqcN556r4nz16qeWObZe04',
};

const PRICING = {
  'StudioStation-2': { label: '2hr StudioStation', price: 498 },
  'StudioStation-4': { label: '4hr StudioStation', price: 996 },
};

interface BookingRequest {
  action: 'create' | 'get' | 'list' | 'update';
  id?: string;
  booking?: {
    client_name: string;
    client_email: string;
    client_phone?: string;
    event_type: string;
    event_date: string;
    event_time?: string;
    duration_hours: number;
    venue_name?: string;
    venue_address?: string;
    notes?: string;
    package_name: string;
  };
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const { action, id, booking, status } = await req.json() as BookingRequest;

    // ── CREATE BOOKING ──────────────────────────────────────────
    if (action === 'create' && booking) {
      const pkg = `${booking.package_name}-${booking.duration_hours}`;
      const paymentLink = STRIPE_LINKS[pkg] || null;
      const pricing = PRICING[pkg] || { label: booking.package_name, price: 0 };
      
      const newBooking = {
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone || null,
        event_type: booking.event_type,
        event_date: booking.event_date,
        event_time: booking.event_time || null,
        duration_hours: booking.duration_hours,
        venue_name: booking.venue_name || null,
        venue_address: booking.venue_address || null,
        notes: booking.notes || null,
        package_name: pricing.label,
        base_price: pricing.price,
        total_price: pricing.price,
        status: 'lead',
        payment_link: paymentLink,
        created_at: new Date().toISOString(),
      };

      // Store to Supabase if available
      let storedBooking = null;
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await supabase.from('bookings').insert(newBooking).select().single();
        if (!error) storedBooking = data;
      }

      return new Response(JSON.stringify({
        status: 'created',
        booking: storedBooking || newBooking,
        payment_link: paymentLink,
        message: `Booking created. Pay deposit here: ${paymentLink}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── GET BOOKING ─────────────────────────────────────────────
    if (action === 'get' && id) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ status: 'error', message: 'Database not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
      return new Response(JSON.stringify({ status: 'ok', booking: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── LIST BOOKINGS ───────────────────────────────────────────
    if (action === 'list') {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ status: 'error', message: 'Database not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      return new Response(JSON.stringify({ status: 'ok', count: data?.length || 0, bookings: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── UPDATE STATUS ───────────────────────────────────────────
    if (action === 'update' && id && status) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(JSON.stringify({ status: 'error', message: 'Database not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase.from('bookings').update({ status }).eq('id', id).select().single();
      return new Response(JSON.stringify({ status: 'updated', booking: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
