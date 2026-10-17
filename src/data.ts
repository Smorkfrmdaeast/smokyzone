export interface ServiceItem {
  id: string;
  category: 'web' | 'phone' | 'va';
  title: string;
  description: string;
  highlights: string[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  category: 'web' | 'phone' | 'marketing' | 'va';
  description: string;
  technologies: string[];
  role: string;
  image: string;
  fallbackImage?: string;
  isExampleConcept?: boolean;
  demoUrl?: string;
  note?: string;
  features?: string[];
}

export interface EntertainmentItem {
  id: string;
  title: string;
  type: string;
  description: string;
  image: string;
  tag: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: string;
  audioSrc?: string;
  albumArt?: string;
  energyVibe: string;
  tag: string;
}

export interface VideoClipItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'drill' | 'eastern' | 'street' | 'studio';
  thumbnail: string;
  duration: string;
  description: string;
  tag: string;
  views: string;
  artistOrTopic: string;
  videoSrc?: string;
}

export interface SocialLink {
  name: string;
  url: string;
  iconClass: string;
  handle: string;
  description: string;
}

export interface UnfilteredThought {
  id: string;
  topic: string;
  quote: string;
  reflection: string;
}

export const SMORK_BIO = {
  fullName: 'Ifeanyi Emmanuel Nnamani',
  alias: 'SMORK',
  brandName: 'SMOKY ZONE',
  handle: '@Smorkfrmdaeast',
  origin: 'East of Nigeria',
  email: 'ifeanyinuels32@gmail.com',
  whatsapp: '+2349019071679',
  whatsappUrl: 'https://wa.me/2349019071679',
  headline: 'ONE MIND. DIFFERENT WORLDS. ONE AUTHENTIC JOURNEY.',
  subheadline:
    "I'm Ifeanyi Emmanuel Nnamani, known as Smork — building digital experiences, expressing real life, and documenting the journey as it unfolds.",
  celebrityQuote:
    "They can copy the style, but they can't copy the journey, the nights, and the spiritual energy.",
  aboutStory: [
    "I am a web developer, virtual assistant, phone flashing & software specialist, digital entrepreneur, content creator, and entertainment personality from the East of Nigeria.",
    "My journey isn't a scripted corporate fairytale. It's built on real hustle, long nights in front of glowing monitors, self-taught discipline, and an unwavering belief in spiritual grounding and continuous self-improvement.",
    "I balance the precision of coding, phone software flashing, and digital administration with the raw, heartfelt storytelling of SMORK UNFILTERED and the electric cultural vibe of CELEBRITY SMORK. One mind, different expressions, completely authentic.",
  ],
  taglineUnfiltered:
    'NO FILTER CAN HIDE REALITY. SO I CHOOSE TO SHOW IT AS IT IS — UNFILTERED, UNAPOLOGETIC, AND REAL.',
};

export const TECH_SERVICES: ServiceItem[] = [
  {
    id: 'business-websites',
    category: 'web',
    title: 'Business Websites',
    description:
      'Modern, high-performance web platforms tailored to help businesses establish authority, attract qualified clients, and convert visitors.',
    highlights: ['Fast load speeds', 'Search optimization', 'Custom brand feel'],
  },
  {
    id: 'landing-pages',
    category: 'web',
    title: 'Landing Pages',
    description:
      'High-converting, laser-focused single page sites structured specifically for product launches, marketing funnels, and service offers.',
    highlights: ['Conversion architecture', 'Lead capture forms', 'Responsive UI'],
  },
  {
    id: 'portfolio-websites',
    category: 'web',
    title: 'Portfolio Websites',
    description:
      'Bespoke digital showcases for creative professionals, developers, agencies, and public figures who need their work to stand out.',
    highlights: ['Interactive showcases', 'Media galleries', 'Personal branding'],
  },
  {
    id: 'website-redesign',
    category: 'web',
    title: 'Website Redesign',
    description:
      'Transforming outdated, slow, or cluttered websites into modern, sleek, and intuitive digital experiences with improved navigation.',
    highlights: ['Visual overhaul', 'Code cleanup', 'Mobile-first redesign'],
  },
  {
    id: 'website-maintenance',
    category: 'web',
    title: 'Website Maintenance',
    description:
      'Ongoing technical upkeep, security monitoring, asset optimization, feature tweaks, and routine content updates to keep your site pristine.',
    highlights: ['Uptime monitoring', 'Security checks', 'Quick turnaround'],
  },
  {
    id: 'mobile-friendly-dev',
    category: 'web',
    title: 'Mobile-Friendly Development',
    description:
      'Crafting seamless touch-first interfaces engineered to perform flawlessly across Android devices, iPhones, tablets, and wide monitors.',
    highlights: ['Fluid layouts', 'Cross-browser testing', 'Touch ergonomics'],
  },
  {
    id: 'email-management',
    category: 'va',
    title: 'Email Management',
    description:
      'Systematic inbox zero organization, categorizing client communications, filtering spam, drafting professional replies, and prioritizing urgent tasks.',
    highlights: ['Inbox zero systems', 'Client correspondence', 'Tagging & routing'],
  },
  {
    id: 'appointment-scheduling',
    category: 'va',
    title: 'Appointment Scheduling',
    description:
      'Seamless calendar management across global time zones, booking coordination, meeting reminders, and agenda preparation.',
    highlights: ['Time zone management', 'Calendar sync', 'Conflict prevention'],
  },
  {
    id: 'customer-support',
    category: 'va',
    title: 'Customer Support',
    description:
      'Attentive, empathetic, and professional support handling user queries, helpdesk tickets, client feedback, and community engagement.',
    highlights: ['Fast response times', 'Issue resolution', 'Professional tone'],
  },
  {
    id: 'data-entry',
    category: 'va',
    title: 'Data Entry & Administration',
    description:
      'Rigorous data transcription, spreadsheet curation, database updates, document processing, and digital filing with zero margin for error.',
    highlights: ['High accuracy', 'Spreadsheet structuring', 'Confidential handling'],
  },
  {
    id: 'phone-flashing-service',
    category: 'phone',
    title: 'Phone Flashing & OS Installation',
    description:
      'Full stock & custom firmware re-flashing, bootloop unbricking, corrupted system restoration, and official OS updates across Android and iOS devices.',
    highlights: ['Bootloop recovery', 'Stock ROM restore', 'Fastboot & Odin workflows'],
  },
  {
    id: 'phone-software-reset',
    category: 'phone',
    title: 'Software Reset & FRP Bypass Assistance',
    description:
      'Clean factory software resets, Google Account FRP lock bypass assistance, PIN/pattern unlocking, and malware cleansing to restore devices to factory speed.',
    highlights: ['FRP verification bypass', 'Factory reset clean', 'System optimization'],
  },
  {
    id: 'bootloop-firmware-recovery',
    category: 'phone',
    title: 'Bootloop & Soft-Brick Firmware Recovery',
    description:
      'Advanced recovery workflows for devices stuck on boot logos, failed OTA system updates, kernel panics, and partition unbricking.',
    highlights: ['Odin & EDL recovery', 'Partition repair', 'System resuscitation'],
  },
];

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'app-architecture',
    title: 'Mobile App Architecture & Cross-Platform Comparison',
    category: 'web',
    description:
      'Comprehensive software architecture engineering comparing Native (Apple iOS, Android, Windows), Hybrid (HTML5 container), and Web App ecosystems. Evaluates runtime performance, direct device hardware API access, compilation lifecycle, and cross-platform UX.',
    technologies: ['HTML5 Architecture', 'Native vs Hybrid', 'Cross-Platform Dev', 'System Analysis'],
    role: 'Full-Stack Software Architecture & UI Engineering',
    image: '/images/app_architecture.png',
    fallbackImage: '/images/images.png',
    features: [
      'Native vs Hybrid vs Progressive Web App breakdown',
      'Runtime performance & memory benchmarking analysis',
      'Device API & hardware sensor integration standards',
      'Multi-platform UI responsiveness across devices'
    ],
  },
  {
    id: 'remote-workstation',
    title: 'Digital Workspace & Remote Operations Lab',
    category: 'va',
    description:
      'High-productivity remote engineering workstation and digital administration workflow. Handles full-stack web builds, client deliverables, automated calendar scheduling, confidential communications, and multi-device software flashing management.',
    technologies: ['Remote Operations', 'Virtual Assistance', 'Web Delivery', 'Workflow Automation'],
    role: 'Virtual Assistant & Digital Specialist',
    image: '/images/workspace_flashing.jpg',
    fallbackImage: '/images/images-2.jpeg',
    features: [
      'Cross-time-zone executive appointment scheduling',
      'Inbox zero client correspondence & filtering architecture',
      'Data transcription & structured documentation pipelines',
      'End-to-end client deliverable sprint tracking'
    ],
  },
  {
    id: 'phone-software-flashing-diag',
    title: 'Smartphone Firmware Flashing & Diagnostics Suite',
    category: 'phone',
    description:
      'Comprehensive mobile device software diagnostics, firmware restoration, bootloop unbricking, and OS partition recovery. Specializes in Odin, SP Flash Tool, Fastboot/ADB protocols, factory software resets, and FRP verification assistance.',
    technologies: ['Firmware Flashing', 'Bootloop Unbricking', 'Odin / SP Flash Tool', 'Fastboot & ADB', 'FRP Reset Assistance'],
    role: 'Mobile Software & Phone Flashing Specialist',
    image: '/images/phone_repair_diag.jpg',
    fallbackImage: '/images/images-3.jpeg',
    note: 'Specialized software servicing, firmware flashing, and OS reset solutions for Android and iOS smartphones.',
    features: [
      'Bootloop unbricking & stock firmware restoration',
      'FRP lock verification bypass & clean factory resets',
      'Kernel panic & corrupted system partition recovery',
      'IMEI repair advisory & baseband signal diagnosis'
    ],
  },
  {
    id: 'omnichannel-marketing',
    title: 'Omnichannel Digital Strategy & Social Campaigns',
    category: 'marketing',
    description:
      'End-to-end digital marketing and social media growth engine. Implements cross-platform campaigns across Instagram, TikTok, YouTube, X, and LinkedIn with audience targeting, engagement funnels, and data analytics dashboards.',
    technologies: ['Audience Growth', 'Social Media Strategy', 'Conversion Funnels', 'Campaign Analytics'],
    role: 'Digital Strategist & Campaign Creator',
    image: '/images/marketing_strategy.jpg',
    fallbackImage: '/images/images-4.jpeg',
    features: [
      'Targeted creative campaigns across TikTok, IG, X, and YouTube',
      'Conversion funnel optimization & lead generation',
      'High-engagement visual copy and video hooks',
      'Comprehensive audience retention & reach analytics'
    ],
  },
  {
    id: 'interactive-ar-landmark',
    title: 'Interactive 3D / AR Landmark Educational App',
    category: 'web',
    description:
      'Immersive mobile AR educational application featuring 3D historical rendering (Statue of Liberty explorer), real-time Time Machine chronologies, interactive X-Ray architectural structural view, and multi-sensory audio guidance.',
    technologies: ['Interactive 3D / AR', 'Mobile UI / UX', 'Time Machine Chronology', 'Educational Tech'],
    role: 'Frontend & Interactive Mobile Experience',
    image: '/images/interactive_ar.jpg',
    fallbackImage: '/images/images-5.jpeg',
    features: [
      '3D Landmark real-time interactive rotation & inspection',
      'Time Machine historical chronology slider',
      'X-Ray internal copper & steel armature view mode',
      'Spatial voice narration and educational facts engine'
    ],
  },
  {
    id: 'prestige-academy',
    title: 'Prestige Academy Schools Portal',
    category: 'web',
    description:
      'An educational institution portal demonstration designed with clean navigation, admissions overview, academic programmes, and responsive layouts.',
    technologies: ['HTML5', 'CSS3', 'Responsive Layouts', 'UI Design'],
    role: 'Frontend Demonstration / Conceptual Showcase',
    image: '/images/prestige_academy_screenshot.svg',
    fallbackImage: '/images/images.png',
    isExampleConcept: true,
    note: 'Showcase example demonstrating institutional website structuring and modern responsive educational portals.',
    features: [
      'Admissions pipeline & academic syllabus viewer',
      'Cross-device mobile-first navigation architecture',
      'Parent-teacher communication channels',
      'Student portal dashboard prototype'
    ],
  },
];

export const UNFILTERED_THOUGHTS: UnfilteredThought[] = [
  {
    id: '1',
    topic: 'Real Life & Struggles',
    quote: 'Behind every quiet success is a mountain of obstacles nobody was around to witness.',
    reflection:
      'We live in a world that only applauds the highlight reels. But real growth is forged in moments of uncertainty, limited resources, and choosing to show up every single day regardless.',
  },
  {
    id: '2',
    topic: 'Limitations & Hustle',
    quote: 'You do not wait for ideal conditions to build. You start with what you have in your hands.',
    reflection:
      'Coming up from the East of Nigeria taught me that resilience is not a motivational quote—it is a daily practice. Limitations are real, but they do not get the final say.',
  },
  {
    id: '3',
    topic: 'Thoughts People Fear To Say',
    quote: 'Authenticity is expensive because it costs you the approval of people living in pretense.',
    reflection:
      'People spend years putting up a front that suffocates them. When you speak your truth without filter, you give others permission to breathe.',
  },
  {
    id: '4',
    topic: 'Personal Growth',
    quote: 'Balance your hustle life with your spirit life. One provides for your hands, the other sustains your soul.',
    reflection:
      'Pushing hard in technology and business is crucial, but keeping your inner compass grounded is what prevents you from losing yourself along the way.',
  },
];

export const CELEBRITY_SMORK_CONTENT: EntertainmentItem[] = [
  {
    id: 'music-reactions',
    title: 'Bronx & Global Drill Breakdown',
    type: 'Music Reactions & Commentary',
    description:
      'In-depth rhythm dissections, lyrical flow analysis, and raw reactions to drill music, complex cadence patterns, and street storytelling.',
    image: '/images/drill_culture.jpg',
    tag: 'Drill Culture',
  },
  {
    id: 'eastern-spotlight',
    title: 'Eastern Nigerian Artist Spotlight',
    type: 'Upcoming Artist Discovery',
    description:
      'Dedicated spotlight on emerging talent from the East of Nigeria, celebrating authentic sounds, street anthems, and indigenous music culture.',
    image: '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
    tag: 'Eastern Sounds',
  },
  {
    id: 'soundtrack-studio',
    title: 'Studio Vibes & Sonic Energy',
    type: 'Music Discovery & Atmosphere',
    description:
      'The sonic backdrop that fuels the creative zone—from Gunna to high-energy street parties and late-night studio sessions.',
    image: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    tag: 'Studio Energy',
  },
  {
    id: 'street-vibes',
    title: 'Street Party Vibes & Dance Unity',
    type: 'Entertainment & Community',
    description:
      'Capturing the electric atmosphere, community energy, and expressive dance culture of live street parties and concerts.',
    image: '/images/street_party.jpg',
    tag: 'Live Vibe',
  },
];

export const CELEBRITY_PLAYLIST: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'On One Tonight',
    artist: 'Gunna',
    genre: 'Melodic Trap',
    duration: '1:53',
    audioSrc: '/music/Gunna - on one tonight [Official Visualizer].mp3',
    albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    energyVibe: 'Hypnotic flow, fresh out of Lenox, titanium luxury & melodic bounce',
    tag: 'Official Selection',
  },
  {
    id: 'track-2',
    title: 'endless',
    artist: 'Gunna',
    genre: 'Melodic Trap',
    duration: '2:11',
    audioSrc: '/music/Gunna - on one tonight [Official Visualizer].mp3',
    albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    energyVibe: 'Hypnotic flow, fresh out of Lenox, titanium luxury & melodic bounce',
    tag: 'Official Selection',
  },
  {
    id: 'track-3',
    title: 'Put Work (Needs Review)',
    artist: 'Smork / Underground Artist',
    genre: 'Afrobeats / Street-Hop',
    duration: '2:53',
    audioSrc: '/music/Gunna - on one tonight [Official Visualizer].mp3',
    albumArt: '/images/street_party.jpg',
    energyVibe: 'Relentless Eastern hustle, daily grind, pure street resilience',
    tag: 'Needs Review',
  },
  {
    id: 'track-4',
    title: 'Dior',
    artist: 'Pop Smoke',
    genre: 'Brooklyn Drill',
    duration: '2:52',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/drill_culture.jpg',
    energyVibe: 'Legendary sliding 808s, iconic Brooklyn drill anthem',
    tag: 'Brooklyn Drill',
  },
  {
    id: 'track-5',
    title: 'Declan Rice',
    artist: 'ODUMODUBLVCK',
    genre: 'Afro-Drill / Okporoko',
    duration: '2:06',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
    energyVibe: 'Unyielding African street spirit, marching Okporoko cadence',
    tag: 'Afro-Drill',
  },
  {
    id: 'track-6',
    title: 'In A Minute',
    artist: 'Lil Baby',
    genre: 'Melodic Trap',
    duration: '3:26',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/celebrity_smork.jpg',
    energyVibe: 'Reflective grind, counting blessings, building digital empires',
    tag: 'Melodic Trap',
  },
  {
    id: 'track-7',
    title: 'Big Drip',
    artist: 'Fivio Foreign',
    genre: 'Brooklyn Drill',
    duration: '2:48',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    energyVibe: 'Signature ad-libs, heavy bounce & club domination',
    tag: 'Brooklyn Drill',
  },
  {
    id: 'track-8',
    title: 'Do I',
    artist: 'Phyno',
    genre: 'Igbo Rap / Afro-Fusion',
    duration: '2:19',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/street_party.jpg',
    energyVibe: 'Heavy bouncing percussions, celebratory Eastern swagger',
    tag: 'Igbo Rap',
  },
  {
    id: 'track-9',
    title: '11:11',
    artist: 'JeriQ',
    genre: 'Indigenous Drill',
    duration: '2:00',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
    energyVibe: 'Raw Igbo hustle poetry, gritty street resilience from Enugu',
    tag: 'Indigenous Drill',
  },
  {
    id: 'track-10',
    title: '11:11 Instrumental (Needs Review)',
    artist: 'JeriQ & Insane Chips',
    genre: 'Trap Instrumental',
    duration: '2:31',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    energyVibe: 'Atmospheric studio beat, punchy 808s, raw session energy',
    tag: 'Needs Review',
  },
  {
    id: 'track-11',
    title: 'Shake It',
    artist: 'Kay Flock ft. Cardi B, Dougie B & Bory300',
    genre: 'Bronx Drill',
    duration: '2:16',
    audioSrc: '/music/gunna_on_one_tonight.mp3',
    albumArt: '/images/drill_culture.jpg',
    energyVibe: 'High BPM, raw street adrenaline & aggressive BX cadence',
    tag: 'Bronx Drill',
  },
];

export const VIDEO_PREVIEW_CLIPS: VideoClipItem[] = [
  {
    id: 'clip-drill',
    title: 'Bronx Drill Short',
    subtitle: 'Sha EK singing — Raw Street Delivery & Energy',
    category: 'drill',
    thumbnail: '/images/drill_culture.jpg',
    duration: '0:05',
    description:
      'Sha EK singing live on the block, bringing aggressive Bronx cadence, rapid delivery, and authentic street resonance.',
    tag: 'Sha EK Singing',
    views: '142.8K views',
    artistOrTopic: 'Sha EK Singing',
  },
  {
    id: 'clip-eastern',
    title: 'Eastern Nigeria Upcoming Artist Spotlight',
    subtitle: 'Nanni Omologo singing — Authentic Eastern Cadence',
    category: 'eastern',
    thumbnail: '/images/StockCake-Neon Dance Silhouette_1758587304.jpg',
    duration: '0:05',
    description:
      'Nanni Omologo delivering raw indigenous melodies and gritty Eastern street rhythms straight from the grassroots of the East.',
    tag: 'Nanni Omologo Singing',
    views: '116.4K views',
    artistOrTopic: 'Nanni Omologo Singing',
  },
  {
    id: 'clip-street-party',
    title: 'Live Street Party & Concert',
    subtitle: 'Enugu street nightlife crowd — Stadium Chants & Unity',
    category: 'street',
    thumbnail: '/images/street_party.jpg',
    duration: '0:05',
    description:
      'High-voltage footage of the Enugu street nightlife crowd shouting every lyric under neon lanterns and street flare illumination.',
    tag: 'Enugu Street Nightlife',
    views: '189.2K views',
    artistOrTopic: 'Enugu Street Nightlife Crowd',
  },
  {
    id: 'clip-studio',
    title: 'Studio Vibes & Late-Night Club Flow',
    subtitle: 'Rear-camera studio recording — Behind The Console & Mic',
    category: 'studio',
    thumbnail: '/images/StockCake-Neon Music Studio_1758587212.jpg',
    duration: '0:05',
    description:
      'Direct rear-camera recording capturing late-night booth takes, booming studio monitors, and spontaneous freestyle sessions.',
    tag: 'Rear-Camera Studio Recording',
    views: '94.3K views',
    artistOrTopic: 'Rear-Camera Studio Recording',
  },
];

export const SOCIAL_PROFILES: SocialLink[] = [
  {
    name: 'Instagram',
    url: 'https://instagram.com/Smork_frmdaeast',
    iconClass: 'fa-brands fa-instagram',
    handle: '@Smork_frmdaeast',
    description: 'Daily life, personal content, and updates',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@Smorkfrmdaeast',
    iconClass: 'fa-brands fa-tiktok',
    handle: '@Smorkfrmdaeast',
    description: 'Reactions, short-form thoughts, and entertainment',
  },
  {
    name: 'WhatsApp',
    url: 'https://wa.me/2349019071679',
    iconClass: 'fa-brands fa-whatsapp',
    handle: '+234 901 907 1679',
    description: 'Direct inquiries, tech services & collaborations',
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com/@Smorkfrmdaeast',
    iconClass: 'fa-brands fa-youtube',
    handle: '@Smorkfrmdaeast',
    description: 'Long-form commentary, music reactions & stories',
  },
  {
    name: 'Facebook',
    url: 'https://facebook.com/Smorkfrmdaeast',
    iconClass: 'fa-brands fa-facebook',
    handle: 'Smorkfrmdaeast',
    description: 'Community updates and discussions',
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com/in/Smorkfrmdaeast',
    iconClass: 'fa-brands fa-linkedin-in',
    handle: 'Smorkfrmdaeast',
    description: 'Professional tech & virtual assistant network',
  },
  {
    name: 'X (Twitter)',
    url: 'https://x.com/Smorkfrmdaeast',
    iconClass: 'fa-brands fa-x-twitter',
    handle: '@Smorkfrmdaeast',
    description: 'Unfiltered thoughts, tech commentary & culture',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/Smorkfrmdaeast',
    iconClass: 'fa-brands fa-github',
    handle: 'Smorkfrmdaeast',
    description: 'Code repositories and web projects',
  },
  {
    name: 'Telegram',
    url: 'https://t.me/Smorkfrmdaeast',
    iconClass: 'fa-brands fa-telegram',
    handle: '@Smorkfrmdaeast',
    description: 'Direct message broadcast and contact',
  },
  {
    name: 'Discord',
    url: 'https://discord.com/users/1162373202610233364',
    iconClass: 'fa-brands fa-discord',
    handle: 'Smorkfrmdaeast',
    description: 'Tech discussions and community chat',
  },
];
