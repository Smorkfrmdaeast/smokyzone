// Intelligent Audio File Parser, ID3v2 Tag Reader & Best Matching Genre Auto-Loader
// Designed specifically for Smoky Zone's street drill, trap, afro-fusion, and cultural catalog.

export interface GenreMatchResult {
  genre: string;
  confidence: number;
  tags: string[];
  energyVibe: string;
  suggestedTag: string;
  reason: string;
}

export interface ExtractedAudioMetadata {
  title: string;
  artist: string;
  genre: string;
  tag: string;
  energyVibe: string;
  duration: string;
  durationSeconds?: number;
  genreMatch: GenreMatchResult;
}

export const GENRE_PRESETS = [
  'Melodic Trap',
  'Street Drill',
  'Brooklyn Drill',
  'Bronx Drill',
  'UK Drill',
  'Afrobeats / Afro-Fusion',
  'Afro-Drill / Street-Hop',
  'Eastern Cultural Rap',
  'Igbo Rap / Afro-Fusion',
  'Indigenous Drill',
  'Raw Drill Anthem',
  'Hip-Hop / East Coast',
  'Trap & 808s',
  'Trap Instrumental',
  'R&B / Soul Drill',
] as const;

export type GenrePreset = typeof GENRE_PRESETS[number];

/**
 * Intelligent parser that cleans messy audio filenames like:
 * "Gunna - on one tonight [Official Visualizer].mp3" -> Artist: "Gunna", Title: "on one tonight"
 * "Smork - Street Anthem (Raw Drill).wav" -> Artist: "Smork", Title: "Street Anthem"
 */
export const parseSongFilename = (
  filename: string
): { artist?: string; title: string; detectedGenre: string; match: GenreMatchResult } => {
  if (!filename) {
    const fallbackMatch = detectBestMatchingGenre('Untitled Track', 'Smork');
    return { title: 'Untitled Track', detectedGenre: fallbackMatch.genre, match: fallbackMatch };
  }

  // Remove extension
  let clean = filename.replace(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i, '');

  // Strip video/audio metadata tags commonly found in downloaded music
  clean = clean
    .replace(/\[\s*(official\s*(music\s*)?video|official\s*visualizer|official\s*audio|visualizer|audio|lyrics?|4k|hd|explicit|prod\.?[^\]]*)\s*\]/gi, '')
    .replace(/\(\s*(official\s*(music\s*)?video|official\s*visualizer|official\s*audio|visualizer|audio|lyrics?|4k|hd|explicit)\s*\)/gi, '')
    .replace(/_/g, ' ')
    .trim();

  let artist: string | undefined;
  let title = clean;

  // Split on common hyphen / dash separators: "Artist - Title"
  if (clean.includes(' - ') || clean.includes(' – ') || clean.includes(' — ')) {
    const parts = clean.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Fallback cleanup of double spaces
  title = title.replace(/\s{2,}/g, ' ').trim();
  if (artist) {
    artist = artist.replace(/\s{2,}/g, ' ').trim();
  }

  const match = detectBestMatchingGenre(title, artist);

  return {
    artist,
    title: title || 'Untitled Track',
    detectedGenre: match.genre,
    match,
  };
};

/**
 * Fast client-side ID3v2 tag reader (zero external dependencies).
 * Inspects the first 64KB of an audio file for embedded Title (TIT2), Artist (TPE1), and Genre (TCON).
 */
async function readQuickId3Tags(file: File): Promise<{ title?: string; artist?: string; genre?: string }> {
  try {
    const slice = await file.slice(0, 65536).arrayBuffer();
    const bytes = new Uint8Array(slice);
    if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
      return {};
    }

    const decodeFrameText = (start: number, length: number): string => {
      if (length <= 1 || start + length > bytes.length) return '';
      const encoding = bytes[start];
      const payload = bytes.slice(start + 1, start + length);
      try {
        let decoded = '';
        if (encoding === 1 || encoding === 2) {
          decoded = new TextDecoder('utf-16').decode(payload);
        } else if (encoding === 3) {
          decoded = new TextDecoder('utf-8').decode(payload);
        } else {
          decoded = new TextDecoder('iso-8859-1').decode(payload);
        }
        return decoded.replace(/\0/g, '').trim();
      } catch {
        return '';
      }
    };

    const result: { title?: string; artist?: string; genre?: string } = {};
    let offset = 10;
    const limit = Math.min(bytes.length - 10, 64000);

    while (offset < limit) {
      const frameId = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3]
      );
      if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

      const size =
        (bytes[offset + 4] << 24) |
        (bytes[offset + 5] << 16) |
        (bytes[offset + 6] << 8) |
        bytes[offset + 7];

      if (size <= 0 || offset + 10 + size > bytes.length) break;

      if (frameId === 'TIT2') {
        const val = decodeFrameText(offset + 10, size);
        if (val) result.title = val;
      } else if (frameId === 'TPE1') {
        const val = decodeFrameText(offset + 10, size);
        if (val) result.artist = val;
      } else if (frameId === 'TCON') {
        const val = decodeFrameText(offset + 10, size).replace(/^\(\d+\)/, '').trim();
        if (val) result.genre = val;
      }

      offset += 10 + size;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Extracts duration from an audio File without blocking upload
 */
function readAudioDurationFast(objUrl: string): Promise<{ formatted: string; seconds?: number }> {
  return new Promise((resolve) => {
    const audioEl = new Audio();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ formatted: '2:45' });
      }
    }, 3000);

    audioEl.onloadedmetadata = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (audioEl.duration && !isNaN(audioEl.duration) && isFinite(audioEl.duration)) {
        const mins = Math.floor(audioEl.duration / 60);
        const secs = Math.floor(audioEl.duration % 60);
        resolve({
          formatted: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
          seconds: Math.round(audioEl.duration),
        });
      } else {
        resolve({ formatted: '2:45' });
      }
    };

    audioEl.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ formatted: '2:45' });
    };

    audioEl.preload = 'metadata';
    audioEl.src = objUrl;
  });
}

/**
 * High-accuracy genre detection engine.
 * Evaluates embedded genre tags, artist discography, title/filename cues, and duration profile.
 */
export const detectBestMatchingGenre = (
  rawTitleOrFilename: string,
  artistInput?: string,
  embeddedGenre?: string,
  durationSeconds?: number
): GenreMatchResult => {
  const text = `${artistInput || ''} ${rawTitleOrFilename || ''} ${embeddedGenre || ''}`.toLowerCase();

  // 0. Respect explicit embedded ID3 genres if specific
  if (embeddedGenre) {
    const eg = embeddedGenre.toLowerCase();
    if (eg.includes('afro') && eg.includes('drill')) {
      return {
        genre: 'Afro-Drill / Street-Hop',
        confidence: 0.98,
        tags: ['Afro-Drill', 'Street Percussion'],
        energyVibe: 'Gritty Afro-Drill percussion blended with street cadence',
        suggestedTag: 'Afro-Drill',
        reason: `Loaded directly from audio file metadata (${embeddedGenre})`,
      };
    }
    if (eg.includes('r&b') || eg.includes('soul')) {
      return {
        genre: 'R&B / Soul Drill',
        confidence: 0.96,
        tags: ['Smooth Soul', 'Melodic Bounce'],
        energyVibe: 'Late-night R&B mood over smooth basslines',
        suggestedTag: 'Soul Vibe',
        reason: `Matched embedded audio tag (${embeddedGenre})`,
      };
    }
  }

  // 1. Eastern Cultural Rap / Igbo Drill Identity
  if (
    text.includes('smork') ||
    text.includes('frmdaeast') ||
    text.includes('east of nigeria') ||
    text.includes('igbo') ||
    text.includes('enugu') ||
    text.includes('phyno') ||
    text.includes('jeriq') ||
    text.includes('flavour') ||
    text.includes('zoro') ||
    text.includes('illbliss')
  ) {
    if (text.includes('instrumental') || text.includes('beat')) {
      return {
        genre: 'Trap Instrumental',
        confidence: 0.96,
        tags: ['Studio Beat', '808 Bounce'],
        energyVibe: 'Atmospheric Eastern studio beat with punchy 808s',
        suggestedTag: 'Instrumental',
        reason: 'Matched Eastern studio instrumental markers',
      };
    }
    if (text.includes('jeriq') || text.includes('11:11')) {
      return {
        genre: 'Indigenous Drill',
        confidence: 0.98,
        tags: ['Indigenous Drill', 'East Hustle'],
        energyVibe: 'Raw Igbo hustle poetry & gritty Eastern street cadence',
        suggestedTag: 'Indigenous Drill',
        reason: 'Matched Eastern Indigenous Drill signature',
      };
    }
    return {
      genre: 'Eastern Cultural Rap',
      confidence: 0.97,
      tags: ['Smork Signature', 'East Coast Naija', 'Drill Flow'],
      energyVibe: 'Authentic Eastern Nigerian street storytelling & bounce',
      suggestedTag: 'Eastern Anthem',
      reason: 'Matched Eastern Nigerian hip-hop & Smork authentic signature sound',
    };
  }

  // 2. Afro-Drill / Okporoko (ODUMODUBLVCK, Shallipopi, Blaqbonez)
  if (
    text.includes('odumodu') ||
    text.includes('shallipopi') ||
    text.includes('blaqbonez') ||
    text.includes('seyi vibez') ||
    text.includes('okporoko') ||
    text.includes('declan rice') ||
    text.includes('afro-drill') ||
    text.includes('afro drill')
  ) {
    return {
      genre: 'Afro-Drill / Street-Hop',
      confidence: 0.97,
      tags: ['Afro-Drill', 'High Energy', 'Street Bounce'],
      energyVibe: 'Unyielding African street spirit & heavy rhythmic cadence',
      suggestedTag: 'Afro-Drill',
      reason: 'Matched Nigerian Afro-Drill & Street-Hop sonic profile',
    };
  }

  // 3. Melodic Trap (Gunna, Lil Baby, Future, Young Thug, Roddy Ricch, Travis Scott)
  if (
    text.includes('gunna') ||
    text.includes('lil baby') ||
    text.includes('wunna') ||
    text.includes('young thug') ||
    text.includes('future') ||
    text.includes('roddy ricch') ||
    text.includes('travis scott') ||
    text.includes('don toliver') ||
    text.includes('metro boomin') ||
    text.includes('endless') ||
    text.includes('in a minute') ||
    text.includes('drip') ||
    text.includes('on one tonight') ||
    text.includes('fukumean') ||
    text.includes('melodic trap')
  ) {
    return {
      genre: 'Melodic Trap',
      confidence: 0.97,
      tags: ['Smooth 808s', 'Melodic Flow', 'Luxury Bounce'],
      energyVibe: 'Hypnotic melodic bounce, luxury 808s & clean autotune cadence',
      suggestedTag: 'Melodic Trap',
      reason: 'Matched Atlanta Melodic Trap artist style & cadences',
    };
  }

  // 4. Brooklyn / Bronx / NY Drill (Pop Smoke, Fivio Foreign, Kay Flock, Ice Spice, Sheff G)
  if (
    text.includes('kay flock') ||
    text.includes('bronx') ||
    text.includes('shake it') ||
    text.includes('ice spice') ||
    text.includes('dougie b') ||
    text.includes('ny drill')
  ) {
    return {
      genre: 'Bronx Drill',
      confidence: 0.96,
      tags: ['High BPM', 'BX Adrenaline', 'Heavy 808'],
      energyVibe: 'High BPM street adrenaline & aggressive Bronx drill flow',
      suggestedTag: 'Bronx Drill',
      reason: 'Matched Bronx Drill high-tempo rhythm and vocal style',
    };
  }

  if (
    text.includes('pop smoke') ||
    text.includes('fivio foreign') ||
    text.includes('dusty locane') ||
    text.includes('sheff g') ||
    text.includes('sleepy hallow') ||
    text.includes('22gz') ||
    text.includes('dior') ||
    text.includes('big drip') ||
    text.includes('brooklyn') ||
    text.includes('woo')
  ) {
    return {
      genre: 'Brooklyn Drill',
      confidence: 0.97,
      tags: ['Sliding 808s', 'Heavy Bassline', 'BK Swagger'],
      energyVibe: 'Iconic Brooklyn sliding 808 bassline & dark street swagger',
      suggestedTag: 'Brooklyn Drill',
      reason: 'Matched Brooklyn Drill bass-heavy rhythm and cadence',
    };
  }

  // 5. UK Drill (Central Cee, Digga D, Russ Millions, Headie One, Tion Wayne)
  if (
    text.includes('central cee') ||
    text.includes('digga d') ||
    text.includes('russ millions') ||
    text.includes('headie one') ||
    text.includes('tion wayne') ||
    text.includes('k-trap') ||
    text.includes('abra cadabra') ||
    text.includes('doja') ||
    text.includes('loading') ||
    text.includes('wild west') ||
    text.includes('uk drill') ||
    text.includes('mandem')
  ) {
    return {
      genre: 'UK Drill',
      confidence: 0.96,
      tags: ['Sliding 808s', '140 BPM', 'UK Cadence'],
      energyVibe: '140 BPM UK syncopated hi-hats & crisp London delivery',
      suggestedTag: 'UK Drill',
      reason: 'Matched UK Drill sliding sub-bass and syncopated hi-hat characteristics',
    };
  }

  // 6. Afrobeats / Afro-Fusion (Burna Boy, Asake, Wizkid, Davido, Rema, Omah Lay)
  if (
    text.includes('burna boy') ||
    text.includes('asake') ||
    text.includes('wizkid') ||
    text.includes('davido') ||
    text.includes('rema') ||
    text.includes('omah lay') ||
    text.includes('fireboy') ||
    text.includes('ayra starr') ||
    text.includes('afro') ||
    text.includes('amapiano') ||
    text.includes('city boys') ||
    text.includes('last last') ||
    text.includes('lonely at the top') ||
    text.includes('calm down')
  ) {
    return {
      genre: 'Afrobeats / Afro-Fusion',
      confidence: 0.96,
      tags: ['Afro Rhythm', 'Log Drum Bass', 'West African Vibe'],
      energyVibe: 'Infectious Afrobeats percussion & feel-good groovy bassline',
      suggestedTag: 'Afrobeats',
      reason: 'Matched Afrobeats and Amapiano-infused percussion patterns',
    };
  }

  // 7. Trap Instrumental / Beats
  if (
    text.includes('instrumental') ||
    text.includes('type beat') ||
    text.includes('prod.') ||
    text.includes('beat')
  ) {
    return {
      genre: 'Trap Instrumental',
      confidence: 0.93,
      tags: ['Studio Beat', '808s', 'Instrumental'],
      energyVibe: 'Crisp studio instrumental, heavy 808 bounce & raw session energy',
      suggestedTag: 'Instrumental',
      reason: 'Matched studio instrumental / beat markers in track metadata',
    };
  }

  // 8. Raw Drill Anthem
  if (
    text.includes('anthem') ||
    text.includes('opps') ||
    text.includes('slide') ||
    text.includes('freestyle') ||
    text.includes('raw energy') ||
    text.includes('no cuts') ||
    text.includes('cypher') ||
    text.includes('drill')
  ) {
    return {
      genre: 'Raw Drill Anthem',
      confidence: 0.93,
      tags: ['Street Anthem', 'Punchy Kick', 'High Intensity'],
      energyVibe: 'High-octane street anthem, raw energy & unfiltered cadence',
      suggestedTag: 'Official Anthem',
      reason: 'Matched high-octane Street Drill anthem keywords',
    };
  }

  // 9. R&B / Soul Drill
  if (
    text.includes('love') ||
    text.includes('heart') ||
    text.includes('night') ||
    text.includes('soul') ||
    text.includes('rnb') ||
    text.includes('r&b') ||
    text.includes('brent faiyaz') ||
    text.includes('sza') ||
    text.includes('the weeknd') ||
    text.includes('giveon')
  ) {
    return {
      genre: 'R&B / Soul Drill',
      confidence: 0.9,
      tags: ['Late Night Vibe', 'Soulful', 'Smooth Bounce'],
      energyVibe: 'Soulful late-night atmosphere blended with modern sub-bass',
      suggestedTag: 'Late Night Vibe',
      reason: 'Matched R&B / soulful late-night melodic cues',
    };
  }

  // 10. Hip-Hop / East Coast (Drake, 21 Savage, J. Cole, Kendrick, Lil Durk)
  if (
    text.includes('drake') ||
    text.includes('21 savage') ||
    text.includes('j. cole') ||
    text.includes('kendrick') ||
    text.includes('lil durk') ||
    text.includes('king von') ||
    text.includes('rap') ||
    text.includes('hip-hop') ||
    text.includes('hip hop')
  ) {
    return {
      genre: 'Hip-Hop / East Coast',
      confidence: 0.91,
      tags: ['Lyrical Flow', 'Modern Hip-Hop'],
      energyVibe: 'Sharp lyrical storytelling with commanding hip-hop presence',
      suggestedTag: 'Hip-Hop',
      reason: 'Matched mainstream hip-hop & rap discography markers',
    };
  }

  // 11. Duration heuristic fallback
  if (typeof durationSeconds === 'number' && durationSeconds > 0 && durationSeconds <= 155) {
    return {
      genre: 'Street Drill',
      confidence: 0.87,
      tags: ['Fast Paced', 'Drill Beats', 'High Impact'],
      energyVibe: 'Short-burst high-impact Street Drill energy',
      suggestedTag: 'Exclusive',
      reason: 'Compact high-impact track length aligns with modern Street Drill pacing',
    };
  }

  // Default Smoky Zone core sound
  return {
    genre: 'Street Drill',
    confidence: 0.86,
    tags: ['Drill Beats', 'Raw Vibe', 'Smoky Zone Signature'],
    energyVibe: 'Authentic Smoky Zone street drill energy & nocturnal bounce',
    suggestedTag: 'Official Selection',
    reason: 'Loaded Smoky Zone signature Street Drill profile',
  };
};

/**
 * Full high-speed metadata & best-genre extractor for any uploaded audio File
 */
export const extractAudioMetadataFromFile = async (
  file: File,
  objUrl?: string
): Promise<ExtractedAudioMetadata> => {
  const localUrl = objUrl || URL.createObjectURL(file);
  const [id3, dur, parsedFilename] = await Promise.all([
    readQuickId3Tags(file),
    readAudioDurationFast(localUrl),
    Promise.resolve(parseSongFilename(file.name)),
  ]);

  if (!objUrl) {
    try {
      URL.revokeObjectURL(localUrl);
    } catch {
      // ignore
    }
  }

  const finalTitle = id3.title || parsedFilename.title || file.name.replace(/\.[^/.]+$/, '');
  const finalArtist = id3.artist || parsedFilename.artist || 'Smork';
  const genreMatch = detectBestMatchingGenre(finalTitle, finalArtist, id3.genre, dur.seconds);

  return {
    title: finalTitle,
    artist: finalArtist,
    genre: genreMatch.genre,
    tag: genreMatch.suggestedTag,
    energyVibe: genreMatch.energyVibe,
    duration: dur.formatted,
    durationSeconds: dur.seconds,
    genreMatch,
  };
};
