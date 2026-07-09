export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { event, payment } = req.body;
    
    // O Asaas envia o ID do cliente em payment.customer
    const customerId = payment?.customer;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customer ID' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Chave secreta! Não vazar para o front

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing Supabase Config' });
    }

    let statusUpdate = null;
    let periodEndUpdate = null;

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      statusUpdate = 'active';
      // Calcula fim do período (+30 dias) ou lê do payment se houver
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      periodEndUpdate = nextMonth.toISOString();
    } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      statusUpdate = 'past_due';
      // Mantém a data de expiração, a trava do front-end fará o bloqueio se estiver no passado
    }

    if (statusUpdate) {
      // 1. Achar a subscription do banco
      const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?gateway_customer_id=eq.${customerId}&select=id`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const subscriptions = await searchRes.json();
      
      if (subscriptions && subscriptions.length > 0) {
        const subId = subscriptions[0].id;
        
        // 2. Atualizar o status
        const updatePayload = { status: statusUpdate };
        if (periodEndUpdate) {
          updatePayload.current_period_end = periodEndUpdate;
        }

        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${subId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(updatePayload)
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
