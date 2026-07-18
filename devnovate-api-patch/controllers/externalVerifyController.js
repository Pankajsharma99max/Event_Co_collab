// Read-only endpoint for third-party apps (e.g. an external event-submission
// tool) to verify that a given email has been appointed as an organizer
// ("co-host manager") on a live Devnovate event, without exposing the full
// organizer list. Mirrors the lookup pattern already used in
// eventController.getHackathonByName / escapeRegex usage.
const Hackathon = require('../models/Hackathon');
const escapeRegex = require('../utils/escapeRegex');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.verifyCoHost = async (req, res) => {
  try {
    const { eventSlug } = req.params;
    const { email } = req.query;

    if (!eventSlug) {
      return res.status(400).json({ success: false, message: 'eventSlug is required' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email query param is required' });
    }

    const decodedSlug = decodeURIComponent(eventSlug);
    const escaped = escapeRegex(decodedSlug.replace(/-/g, ' '));

    const event = await Hackathon.findOne({
      $or: [
        { hackathon: decodedSlug },
        { eventName: decodedSlug },
        { eventName: decodedSlug.replace(/-/g, ' ') },
        { name: new RegExp(`^${escaped}$`, 'i') },
        { hackathon: new RegExp(`^${escaped}$`, 'i') },
      ],
    }).populate('organizers', 'email role');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found on Devnovate' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isCoHost = (event.organizers || []).some(
      (org) => org && org.email && org.email.toLowerCase() === normalizedEmail
    );

    return res.status(200).json({
      success: true,
      event: {
        id: event._id,
        name: event.name,
        eventName: event.eventName,
        listed: event.live === true,
      },
      isCoHost,
    });
  } catch (error) {
    console.error('Error verifying co-host:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
