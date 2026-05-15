// Curated intellectual fragments — used as editorial breaks throughout the feed.
export type Quote = { text: string; author: string; context?: string };

export const QUOTES: Quote[] = [
  { text: "The trouble with our times is that the future is not what it used to be.", author: "Paul Valéry", context: "On civilisation, 1937" },
  { text: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes", context: "On capital" },
  { text: "The medium is the message.", author: "Marshall McLuhan", context: "Understanding Media, 1964" },
  { text: "History does not repeat itself, but it does rhyme.", author: "Attributed to Mark Twain" },
  { text: "We live in capitalism. Its power seems inescapable — so did the divine right of kings.", author: "Ursula K. Le Guin", context: "2014" },
  { text: "What is now proved was once only imagined.", author: "William Blake", context: "The Marriage of Heaven and Hell" },
  { text: "Those who cannot remember the past are condemned to repeat it.", author: "George Santayana", context: "The Life of Reason" },
  { text: "The unexamined life is not worth living.", author: "Socrates", context: "Apology, 399 BCE" },
  { text: "Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth.", author: "Oscar Wilde" },
  { text: "Power tends to corrupt, and absolute power corrupts absolutely.", author: "Lord Acton", context: "1887" },
  { text: "We shape our tools, and thereafter our tools shape us.", author: "John Culkin", context: "On McLuhan, 1967" },
  { text: "Civilisation begins with order, grows with liberty, and dies with chaos.", author: "Will Durant" },
];

function safeIndex(n: number): number {
  if (!QUOTES.length) return 0;
  const i = Math.abs(Math.floor(n)) % QUOTES.length;
  return Number.isFinite(i) ? i : 0;
}

export function quoteOfTheHour(): Quote {
  const h = new Date().getHours() + new Date().getDate();
  return QUOTES[safeIndex(h)];
}

export function randomQuote(seed?: number): Quote {
  const i = seed !== undefined ? safeIndex(seed) : Math.floor(Math.random() * QUOTES.length);
  return QUOTES[i];
}
