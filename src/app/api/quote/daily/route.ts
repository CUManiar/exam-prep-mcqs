import { NextResponse } from "next/server";

export const revalidate = 86400; // Cache on server for 24 hours

const FALLBACK_UPSC_QUOTES = [
  {
    quote:
      "You have to dream before your dreams can come true. Excellence is a continuous process and not an accident.",
    author: "Dr. A.P.J. Abdul Kalam",
    role: "Former President of India & Scientist",
    tag: "Vision & Consistency",
  },
  {
    quote:
      "Arise, awake, and stop not till the goal is reached. All power is within you; you can do anything and everything.",
    author: "Swami Vivekananda",
    role: "Philosopher & Youth Icon",
    tag: "Unstoppable Will",
  },
  {
    quote:
      "By common endeavor we can raise the country to a new greatness, while a lack of unity will expose us to fresh calamities.",
    author: "Sardar Vallabhbhai Patel",
    role: "Architect of Indian Civil Services",
    tag: "Service to Nation",
  },
  {
    quote:
      "Cultivation of mind should still be the ultimate aim of human existence. Educate, Agitate, Organize.",
    author: "Dr. B.R. Ambedkar",
    role: "Chief Architect of the Indian Constitution",
    tag: "Intellectual Rigor",
  },
  {
    quote:
      "It does not matter how slowly you go as long as you do not stop. The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    role: "Philosopher",
    tag: "Daily Persistence",
  },
  {
    quote:
      "You cannot cross the sea merely by standing and staring at the water. Hard work always brings you to your shore.",
    author: "Rabindranath Tagore",
    role: "Nobel Laureate & Poet",
    tag: "Active Action",
  },
  {
    quote:
      "Success is not final, failure is not fatal: it is the courage to continue that counts in this marathon.",
    author: "Winston Churchill",
    role: "Statesman",
    tag: "Resilience",
  },
  {
    quote:
      "A nation's greatness is measured by how it treats its weakest members. Remember the purpose of your administrative calling.",
    author: "Mahatma Gandhi",
    role: "Father of the Nation",
    tag: "Public Service",
  },
  {
    quote:
      "The secret of getting ahead is getting started. Break your complex overwhelming tasks into small manageable steps.",
    author: "Mark Twain",
    role: "Author & Thinker",
    tag: "Daily Discipline",
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isRandom = searchParams.get("random") === "true";

  // 1. Try FavQs Quote of the Day (or random)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const favQsUrl = isRandom
      ? "https://favqs.com/api/quotes/"
      : "https://favqs.com/api/qotd";

    const res = await fetch(favQsUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: isRandom ? 0 : 86400 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.quote?.body && data?.quote?.author) {
        return NextResponse.json(
          {
            quote: data.quote.body.trim(),
            author: data.quote.author.trim(),
            role: "Daily Inspiration",
            tag: data.quote.tags?.[0]
              ? data.quote.tags[0].charAt(0).toUpperCase() +
                data.quote.tags[0].slice(1)
              : "Daily Wisdom",
            source: "favqs",
          },
          {
            headers: {
              "Cache-Control": isRandom
                ? "no-cache"
                : "public, s-maxage=86400, stale-while-revalidate=43200",
            },
          },
        );
      }
    }
  } catch {}

  // 2. Try DummyJSON Quotes as secondary reliable open-source API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("https://dummyjson.com/quotes/random", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: isRandom ? 0 : 86400 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.quote && data?.author) {
        return NextResponse.json(
          {
            quote: data.quote.trim(),
            author: data.author.trim(),
            role: "Thought of the Day",
            tag: "Motivation",
            source: "dummyjson",
          },
          {
            headers: {
              "Cache-Control": isRandom
                ? "no-cache"
                : "public, s-maxage=86400, stale-while-revalidate=43200",
            },
          },
        );
      }
    }
  } catch {}

  // 3. Fallback to curated civil services quotes
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const fallbackIndex = isRandom
    ? Math.floor(Math.random() * FALLBACK_UPSC_QUOTES.length)
    : dayOfYear % FALLBACK_UPSC_QUOTES.length;

  const fallback =
    FALLBACK_UPSC_QUOTES[fallbackIndex] || FALLBACK_UPSC_QUOTES[0];

  return NextResponse.json(
    {
      ...fallback,
      source: "curated",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    },
  );
}
