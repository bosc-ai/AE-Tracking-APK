/**
 * Supabase Edge Function: notify-customer
 * 
 * Sends WhatsApp and SMS notifications to customers via Twilio
 * when delivery events occur (confirmed, out_for_delivery, delivered, failed).
 * 
 * DEPLOYMENT:
 * 1. Install Supabase CLI: npm i -g supabase
 * 2. Link your project: supabase link --project-ref YOUR_PROJECT_REF
 * 3. Set secrets:
 *    supabase secrets set TWILIO_ACCOUNT_SID=your_sid
 *    supabase secrets set TWILIO_AUTH_TOKEN=your_token
 *    supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 *    supabase secrets set TWILIO_SMS_FROM=+1234567890
 * 4. Deploy: supabase functions deploy notify-customer
 * 
 * TRIGGER: Call this function via supabase.functions.invoke('notify-customer', { body: {...} })
 * or set up a Database Webhook on the `orders` table for status changes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886'
const TWILIO_SMS_FROM = Deno.env.get('TWILIO_SMS_FROM') || ''

interface NotifyRequest {
  order_id: string
  event: 'confirmed' | 'out_for_delivery' | 'delivered' | 'failed'
  customer_phone: string
  customer_name: string
  driver_name?: string
  driver_phone?: string
  tracking_url?: string
  eta?: string
}

function buildMessage(data: NotifyRequest): string {
  switch (data.event) {
    case 'confirmed':
      return `Hi ${data.customer_name}! 🎉 Your order ${data.order_id} has been confirmed. We'll notify you when it's out for delivery.`
    
    case 'out_for_delivery':
      return `Hi ${data.customer_name}! 🚚 Your order ${data.order_id} is out for delivery!\n\n` +
        `Driver: ${data.driver_name}\n` +
        `ETA: ${data.eta || 'Calculating...'}\n` +
        `Track live: ${data.tracking_url}\n\n` +
        `Call driver: ${data.driver_phone}`
    
    case 'delivered':
      return `Hi ${data.customer_name}! ✅ Your order ${data.order_id} has been delivered. Thank you for shopping with us!`
    
    case 'failed':
      return `Hi ${data.customer_name}, we were unable to deliver your order ${data.order_id}. Our team will contact you to reschedule. Sorry for the inconvenience!`
    
    default:
      return `Update on your order ${data.order_id}.`
  }
}

async function sendTwilioMessage(to: string, body: string, channel: 'whatsapp' | 'sms') {
  const fromNumber = channel === 'whatsapp' ? TWILIO_WHATSAPP_FROM : TWILIO_SMS_FROM
  const toNumber = channel === 'whatsapp' ? `whatsapp:${to}` : to

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  
  const params = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: body,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const result = await response.json()
  return { sid: result.sid, status: result.status, channel }
}

serve(async (req) => {
  try {
    const data: NotifyRequest = await req.json()
    const message = buildMessage(data)

    // Send both WhatsApp and SMS in parallel
    const results = await Promise.allSettled([
      sendTwilioMessage(data.customer_phone, message, 'whatsapp'),
      sendTwilioMessage(data.customer_phone, message, 'sms'),
    ])

    const response = results.map((r, i) => ({
      channel: i === 0 ? 'whatsapp' : 'sms',
      success: r.status === 'fulfilled',
      ...(r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason }),
    }))

    return new Response(JSON.stringify({ success: true, notifications: response }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
