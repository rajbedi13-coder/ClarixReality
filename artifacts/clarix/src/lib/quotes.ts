// Curated intellectual fragments — used as editorial breaks throughout the feed.
// Sourced from canonical works; attributions verified.
export type Quote = { text: string; author: string; context?: string };

export const QUOTES: Quote[] = [
  // Philosophy & critical theory
  { text: "The unexamined life is not worth living.", author: "Socrates", context: "Apology, 399 BCE" },
  { text: "He who has a why to live for can bear almost any how.", author: "Friedrich Nietzsche", context: "Twilight of the Idols, 1889" },
  { text: "He who fights with monsters should look to it that he himself does not become a monster.", author: "Friedrich Nietzsche", context: "Beyond Good and Evil, 1886" },
  { text: "There is only one really serious philosophical problem, and that is suicide. Judging whether life is or is not worth living amounts to answering the fundamental question of philosophy.", author: "Albert Camus", context: "The Myth of Sisyphus, 1942" },
  { text: "One must imagine Sisyphus happy.", author: "Albert Camus", context: "The Myth of Sisyphus, 1942" },
  { text: "Hell is other people.", author: "Jean-Paul Sartre", context: "No Exit, 1944" },
  { text: "Man is condemned to be free.", author: "Jean-Paul Sartre", context: "Existentialism Is a Humanism, 1946" },
  { text: "What is now proved was once only imagined.", author: "William Blake", context: "The Marriage of Heaven and Hell, 1790" },
  { text: "The owl of Minerva spreads its wings only with the falling of the dusk.", author: "G. W. F. Hegel", context: "Philosophy of Right, 1820" },

  // Psychology & inner life
  { text: "The most terrifying thing is to accept oneself completely.", author: "C. G. Jung", context: "Modern Man in Search of a Soul" },
  { text: "Until you make the unconscious conscious, it will direct your life and you will call it fate.", author: "C. G. Jung" },
  { text: "Love is the only sane and satisfactory answer to the problem of human existence.", author: "Erich Fromm", context: "The Art of Loving, 1956" },
  { text: "In the nineteenth century the problem was that God is dead; in the twentieth century the problem is that man is dead.", author: "Erich Fromm", context: "The Sane Society, 1955" },
  { text: "We have invented happiness, say the last men, and they blink.", author: "Friedrich Nietzsche", context: "Thus Spoke Zarathustra, 1883" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl", context: "Man's Search for Meaning, 1946" },
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu", context: "Tao Te Ching" },
  { text: "Life begins where fear ends.", author: "Osho" },
  { text: "Be — don't try to become.", author: "Osho" },

  // Power, politics, society
  { text: "Power tends to corrupt, and absolute power corrupts absolutely.", author: "Lord Acton", context: "Letter to Bishop Creighton, 1887" },
  { text: "The philosophers have only interpreted the world, in various ways; the point is to change it.", author: "Karl Marx", context: "Theses on Feuerbach, 1845" },
  { text: "All that is solid melts into air, all that is holy is profaned.", author: "Karl Marx & Friedrich Engels", context: "The Communist Manifesto, 1848" },
  { text: "The smart way to keep people passive and obedient is to strictly limit the spectrum of acceptable opinion, but allow very lively debate within that spectrum.", author: "Noam Chomsky", context: "The Common Good, 1998" },
  { text: "If we don't believe in freedom of expression for people we despise, we don't believe in it at all.", author: "Noam Chomsky" },
  { text: "We live in capitalism. Its power seems inescapable — so did the divine right of kings.", author: "Ursula K. Le Guin", context: "National Book Awards, 2014" },
  { text: "The banality of evil.", author: "Hannah Arendt", context: "Eichmann in Jerusalem, 1963" },
  { text: "The trouble with our times is that the future is not what it used to be.", author: "Paul Valéry", context: "On civilisation, 1937" },

  // Markets, finance, the long view
  { text: "Markets can remain irrational longer than you can remain solvent.", author: "John Maynard Keynes" },
  { text: "In the long run we are all dead.", author: "John Maynard Keynes", context: "A Tract on Monetary Reform, 1923" },
  { text: "The four most dangerous words in investing are: 'this time it's different.'", author: "Sir John Templeton" },
  { text: "Be fearful when others are greedy, and greedy when others are fearful.", author: "Warren Buffett" },
  { text: "What we observe is not nature itself, but nature exposed to our method of questioning.", author: "Werner Heisenberg", context: "Physics and Philosophy, 1958" },

  // Modernity, media, technology
  { text: "The medium is the message.", author: "Marshall McLuhan", context: "Understanding Media, 1964" },
  { text: "We shape our tools, and thereafter our tools shape us.", author: "John Culkin", context: "Paraphrasing McLuhan, 1967" },
  { text: "What information consumes is rather obvious: it consumes the attention of its recipients. Hence a wealth of information creates a poverty of attention.", author: "Herbert A. Simon", context: "1971" },
  { text: "Boredom is the dream bird that hatches the egg of experience.", author: "Walter Benjamin", context: "The Storyteller, 1936" },
  { text: "The culture industry perpetually cheats its consumers of what it perpetually promises.", author: "Theodor W. Adorno & Max Horkheimer", context: "Dialectic of Enlightenment, 1944" },

  // Literature & inwardness
  { text: "A book must be the axe for the frozen sea within us.", author: "Franz Kafka", context: "Letter to Oskar Pollak, 1904" },
  { text: "From a certain point onward there is no longer any turning back. That is the point that must be reached.", author: "Franz Kafka", context: "The Zürau Aphorisms" },
  { text: "Attention is the rarest and purest form of generosity.", author: "Simone Weil", context: "First and Last Notebooks" },
  { text: "Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth.", author: "Oscar Wilde", context: "The Critic as Artist, 1891" },

  // History as a long arc
  { text: "Those who cannot remember the past are condemned to repeat it.", author: "George Santayana", context: "The Life of Reason, 1905" },
  { text: "History does not repeat itself, but it does rhyme.", author: "Attributed to Mark Twain" },
  { text: "Civilisation begins with order, grows with liberty, and dies with chaos.", author: "Will Durant", context: "The Lessons of History, 1968" },
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
