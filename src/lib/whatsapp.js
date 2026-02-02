/**
 * WhatsApp API Service
 * 
 * This service handles sending WhatsApp messages using the Meta WhatsApp Cloud API.
 * You will need to set up a WhatsApp Business App at https://developers.facebook.com/
 */

const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
const VERSION = 'v18.0';

/**
 * Sends a WhatsApp message to a specific phone number.
 * Note: For official WhatsApp Business API, you usually need to use templates 
 * for outbound messages started by the business.
 */
export const sendWhatsAppMessage = async (to, message) => {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.warn('WhatsApp credentials missing. Message not sent:', { to, message });
        return { success: false, error: 'Credentials missing' };
    }

    try {
        // Remove non-numeric characters from phone number
        const cleanPhone = to.replace(/\D/g, '');

        // Ensure it starts with a country code (e.g., 91 for India)
        // This is a simple check, adjust based on your target region
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

        const response = await fetch(`https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: message }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Error:', data);
            return { success: false, error: data };
        }

        return { success: true, data };
    } catch (error) {
        console.error('WhatsApp Service Error:', error);
        return { success: false, error };
    }
};

/**
 * Predefined status update messages
 */
export const sendStatusUpdateMessage = async (appointment, status) => {
    const { full_name, phone, preferred_date, location } = appointment;

    let message = '';
    const dateStr = preferred_date ? new Date(preferred_date).toLocaleDateString() : 'the requested date';

    switch (status) {
        case 'confirmed':
            message = `Hello ${full_name}, your appointment with Dr. Vaibbhav Guray on ${dateStr} at our ${location} center has been CONFIRMED. We look forward to seeing you!`;
            break;
        case 'cancelled':
            message = `Hello ${full_name}, we are sorry to inform you that your appointment with Dr. Vaibbhav Guray on ${dateStr} has been CANCELLED. Please contact us to reschedule.`;
            break;
        case 'completed':
            message = `Hello ${full_name}, thank you for visiting Dr. Vaibbhav Guray today! We hope you have a great day. Feel free to contact us for any follow-up concerns.`;
            break;
        default:
            return; // Don't send for pending or other statuses
    }

    return await sendWhatsAppMessage(phone, message);
};
