import type { BeatBundle, ProfileCard } from "@/lib/types";

const H = "https://www.soundhelix.com/examples/mp3";

export const mockProfiles: ProfileCard[] = [
  {
    id: "1",
    displayName: "Maya Lin",
    role: "producer",
    city: "Boston",
    niche: "melodic trap · soul samples",
    bio: "Beats for artists who want hooks that stick. Collab-friendly, stems on request.",
    highlight: "Latest: placement with an indie vocalist from Toronto.",
    accent: "from-violet-600 to-fuchsia-600",
    starBeat: {
      id: "m1-star",
      title: "Velvet Drums (star)",
      audioUrl: `${H}/SoundHelix-Song-1.mp3`,
      coverUrl: "https://picsum.photos/seed/MayaStar/400/400",
    },
    extraBeats: [
      {
        id: "m1-a",
        title: "Hallway",
        audioUrl: `${H}/SoundHelix-Song-2.mp3`,
        coverUrl: "https://picsum.photos/seed/Maya1/200/200",
      },
      {
        id: "m1-b",
        title: "3am Loop",
        audioUrl: `${H}/SoundHelix-Song-3.mp3`,
        coverUrl: "https://picsum.photos/seed/Maya2/200/200",
      },
      {
        id: "m1-c",
        title: "Gold Leaf",
        audioUrl: `${H}/SoundHelix-Song-4.mp3`,
        coverUrl: "https://picsum.photos/seed/Maya3/200/200",
      },
    ],
  },
  {
    id: "2",
    displayName: "DJ Kairo",
    role: "dj",
    city: "NYC",
    niche: "house · UK garage · open format",
    bio: "Rooftops, warehouses, and rooms that need energy without chaos.",
    highlight: "Residency: monthly party in Brooklyn.",
    accent: "from-amber-500 to-orange-600",
    starBeat: {
      id: "k2-star",
      title: "Warehouse Intro (live blend)",
      audioUrl: `${H}/SoundHelix-Song-5.mp3`,
      coverUrl: "https://picsum.photos/seed/KairoStar/400/400",
    },
    extraBeats: [
      {
        id: "k2-a",
        title: "Garage cut",
        audioUrl: `${H}/SoundHelix-Song-6.mp3`,
        coverUrl: "https://picsum.photos/seed/Kairo1/200/200",
      },
      {
        id: "k2-b",
        title: "Sunset house",
        audioUrl: `${H}/SoundHelix-Song-7.mp3`,
        coverUrl: "https://picsum.photos/seed/Kairo2/200/200",
      },
      {
        id: "k2-c",
        title: "Open format",
        audioUrl: `${H}/SoundHelix-Song-8.mp3`,
        coverUrl: "https://picsum.photos/seed/Kairo3/200/200",
      },
      {
        id: "k2-d",
        title: "Late set",
        audioUrl: `${H}/SoundHelix-Song-9.mp3`,
        coverUrl: "https://picsum.photos/seed/Kairo4/200/200",
      },
      {
        id: "k2-e",
        title: "Encore ride",
        audioUrl: `${H}/SoundHelix-Song-10.mp3`,
        coverUrl: "https://picsum.photos/seed/Kairo5/200/200",
      },
    ],
  },
  {
    id: "3",
    displayName: "Soleil",
    role: "artist",
    city: "LA",
    niche: "R&B · alt-pop",
    bio: "Looking for producers who care about vocal production as much as drums.",
    highlight: "50k monthly listeners — EP dropping spring.",
    accent: "from-emerald-600 to-teal-600",
    starBeat: {
      id: "s3-star",
      title: "Demo: Ocean Fade",
      audioUrl: `${H}/SoundHelix-Song-11.mp3`,
      coverUrl: "https://picsum.photos/seed/SoleilStar/400/400",
    },
    extraBeats: [
      {
        id: "s3-a",
        title: "B-side sketch",
        audioUrl: `${H}/SoundHelix-Song-12.mp3`,
        coverUrl: "https://picsum.photos/seed/Soleil1/200/200",
      },
      {
        id: "s3-b",
        title: "Alt hook",
        audioUrl: `${H}/SoundHelix-Song-13.mp3`,
        coverUrl: "https://picsum.photos/seed/Soleil2/200/200",
      },
    ],
  },
  {
    id: "4",
    displayName: "North End Audio",
    role: "venue",
    city: "Boston",
    niche: "200 cap · live + DJ",
    bio: "We book Thursday electronic and Friday hip-hop. Need reliable openers.",
    highlight: "In-house PA; backline negotiable.",
    accent: "from-slate-600 to-zinc-700",
    starBeat: {
      id: "v4-star",
      title: "Room tone · FOH walk-in",
      audioUrl: `${H}/SoundHelix-Song-14.mp3`,
      coverUrl: "https://picsum.photos/seed/VenueStar/400/400",
    },
    extraBeats: [
      {
        id: "v4-a",
        title: "Thursday vibe",
        audioUrl: `${H}/SoundHelix-Song-15.mp3`,
        coverUrl: "https://picsum.photos/seed/Venue1/200/200",
      },
      {
        id: "v4-b",
        title: "Friday energy",
        audioUrl: `${H}/SoundHelix-Song-16.mp3`,
        coverUrl: "https://picsum.photos/seed/Venue2/200/200",
      },
    ],
  },
];

export const mockBundles: BeatBundle[] = [
  {
    id: "b1",
    creatorId: "1",
    creatorName: "Maya Lin",
    title: "Late Night Keys Pack",
    priceLabel: "$45",
    trackCount: 8,
    genres: ["trap", "R&B"],
    accent: "from-violet-500/30 to-fuchsia-500/20",
  },
  {
    id: "b2",
    creatorId: "x",
    creatorName: "Greyscale",
    title: "Lo-fi Sketchbook",
    priceLabel: "$32",
    trackCount: 12,
    genres: ["lo-fi", "boom bap"],
    accent: "from-zinc-600/40 to-neutral-800/30",
  },
  {
    id: "b3",
    creatorId: "y",
    creatorName: "Studio 4AM",
    title: "Club Starter Kit",
    priceLabel: "$60",
    trackCount: 15,
    genres: ["house", "techno"],
    accent: "from-cyan-500/25 to-blue-600/20",
  },
];
