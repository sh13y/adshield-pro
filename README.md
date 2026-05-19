# AdShield Pro

## The Ultimate YouTube Ad Blocker

AdShield Pro is a powerful Chrome extension that eliminates pre-roll, mid-roll, overlay, and banner ads from YouTube, providing a seamless viewing experience without interruptions.

![AdShield Pro Dashboard](screenshots/figure1.png)

---

## Overview

AdShield Pro uses advanced network-level blocking technology to intercept and eliminate ads before they reach your browser. The extension operates seamlessly in the background, requiring minimal configuration while maximizing ad protection.

---

## Key Features

**Pre-roll & Mid-roll Ad Removal**
- Automatically skips commercials that appear before and during videos
- Enables uninterrupted content consumption

**Overlay & Banner Blocking**
- Removes floating banners and pop-up overlays
- Eliminates sidebar advertisements

**Network-Level Ad Blocking**
- Prevents ad server requests before they load
- Reduces bandwidth usage and page load times

**Tracker Blocking**
- Blocks analytics pixels and tracking scripts
- Enhances user privacy

**Real-Time Activity Monitoring**
- Live counter displays total ads blocked
- Quick-access statistics panel

**Simple Toggle Control**
- Enable/disable protection with a single click
- Configurable settings panel

---

## Technical Specifications

**Technology Stack**
- Manifest Version 3 (MV3)
- Declarative Net Request API
- Content Script Injection
- Background Service Worker

**Supported Platforms**
- Google Chrome 88+
- Chromium-based browsers (Edge, Brave, Opera, Vivaldi)

---

## Installation & Setup

1. Navigate to the Chrome Web Store
2. Search for "AdShield Pro"
3. Click "Add to Chrome"
4. Grant necessary permissions when prompted
5. The extension activates automatically on YouTube

No configuration required—the extension works out of the box.

---

## How It Works

AdShield Pro leverages the **Declarative Net Request API**, Google's recommended approach for content blocking in modern Chrome extensions. This technology:

- Intercepts HTTP requests at the network level
- Matches requests against predefined ruleset
- Blocks ad-serving domains before content loads
- Requires no active background processing
- Ensures minimal performance impact

The extension specifically targets:
- YouTube advertising domains
- Google ad services infrastructure
- Third-party tracking services
- Analytics and pixel tracking

---

## Permissions Explained

The extension requests the following permissions, each serving a specific purpose:

| Permission | Purpose |
|-----------|---------|
| `declarativeNetRequest` | Enables network-level ad blocking |
| `storage` | Saves user preferences and settings |
| `tabs` | Identifies YouTube tabs for targeted operation |
| `activeTab` | Accesses current tab information |
| `scripting` | Injects content modification scripts |

All permissions are scoped to YouTube and related ad-serving domains.

---

## Privacy & Security

**Data Protection**
- No personal data collection
- No server communication
- No watch history tracking
- Entirely offline operation

**Scope Limitations**
- Operates exclusively on YouTube
- Does not affect other websites
- Cannot access sensitive information
- Respects standard browser security models

**Transparency**
- Open-source codebase
- No hidden telemetry
- No third-party data sharing

For complete details, please review our [Privacy Policy](PRIVACY_POLICY.md).

---

## Version History

**v2.0.0**
- Optimized performance using Declarative Net Request API
- Enhanced ad detection capabilities
- Improved overlay blocking
- Refined user interface
- Expanded tracker blocking

---

## System Requirements

- **Browser**: Google Chrome 88 or later
- **OS**: Windows, macOS, Linux
- **Internet**: Not required (works offline)
- **Account**: Optional (supports both logged-in and guest modes)

---

## Support & Feedback

For technical issues, feature requests, or general feedback, please visit our support channels or submit feedback through the Chrome Web Store.

---

## License

Licensed under the MIT License. The source code is available for review and contribution.

---

**AdShield Pro** — Professional YouTube Ad Blocking
