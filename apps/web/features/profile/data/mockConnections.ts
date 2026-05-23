type MockConnection = {
  username: string;
  role: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
};

const MOCK_TEMPLATE: MockConnection[] = [
  { username: "k.szabo", role: "Editor · Budapest", initial: "K", avatarBg: "linear-gradient(135deg,#2d3a4a,#1a2530)", avatarColor: "#7a9eb0" },
  { username: "nora.dop", role: "DP · Paris", initial: "N", avatarBg: "linear-gradient(135deg,#2a1e30,#3a2a40)", avatarColor: "#9a7ab0" },
  { username: "t.osei", role: "Director · Accra", initial: "T", avatarBg: "linear-gradient(135deg,#1e2a1a,#2a3a22)", avatarColor: "#7a9e6a" },
  { username: "m.chen", role: "Colorist · Taipei", initial: "M", avatarBg: "linear-gradient(135deg,#1a2a3a,#0e1822)", avatarColor: "#8ab4c8" },
  { username: "sofia.reel", role: "Programmer · TIFF", initial: "S", avatarBg: "linear-gradient(135deg,#3a2a1e,#2a2018)", avatarColor: "#d4a574" },
  { username: "j.rivera", role: "1st AD · Mexico City", initial: "J", avatarBg: "linear-gradient(135deg,#2e1a2a,#1a1520)", avatarColor: "#c49ebd" },
  { username: "a.okafor", role: "Sound · Lagos", initial: "A", avatarBg: "linear-gradient(135deg,#1e2e2a,#152018)", avatarColor: "#7ec4a8" },
  { username: "elena.vfx", role: "Compositor · Madrid", initial: "E", avatarBg: "linear-gradient(135deg,#2a2238,#18152a)", avatarColor: "#a898d8" },
  { username: "d.kim", role: "Gaffer · Seoul", initial: "D", avatarBg: "linear-gradient(135deg,#1a2530,#0f1820)", avatarColor: "#9eb8d0" },
  { username: "r.bakker", role: "Producer · Amsterdam", initial: "R", avatarBg: "linear-gradient(135deg,#2a3020,#1a2218)", avatarColor: "#b8c878" },
  { username: "y.tanaka", role: "Still photographer · Tokyo", initial: "Y", avatarBg: "linear-gradient(135deg,#252530,#15151c)", avatarColor: "#c0c0d8" },
  { username: "l.mensah", role: "Writer · London", initial: "L", avatarBg: "linear-gradient(135deg,#302018,#1a140e)", avatarColor: "#e0a878" },
  { username: "p.andersson", role: "Focus puller · Stockholm", initial: "P", avatarBg: "linear-gradient(135deg,#1e2430,#121820)", avatarColor: "#90a8c8" },
  { username: "h.patel", role: "Post supervisor · Mumbai", initial: "H", avatarBg: "linear-gradient(135deg,#2a1e28,#18121a)", avatarColor: "#d898b8" },
  { username: "c.moreau", role: "Costume · Lyon", initial: "C", avatarBg: "linear-gradient(135deg,#252018,#181410)", avatarColor: "#d8b898" },
  { username: "b.nguyen", role: "Editor · Hanoi", initial: "B", avatarBg: "linear-gradient(135deg,#1a2e28,#0e1a16)", avatarColor: "#78c8a8" },
  { username: "g.santos", role: "Location scout · São Paulo", initial: "G", avatarBg: "linear-gradient(135deg,#302a1a,#1c1810)", avatarColor: "#e8d078" },
  { username: "v.kowalski", role: "Steadicam · Warsaw", initial: "V", avatarBg: "linear-gradient(135deg,#222830,#12161c)", avatarColor: "#a8b0c8" },
  { username: "f.alvarez", role: "Composer · Barcelona", initial: "F", avatarBg: "linear-gradient(135deg,#2a1824,#180e14)", avatarColor: "#e898b0" },
  { username: "w.johansson", role: "DIT · Copenhagen", initial: "W", avatarBg: "linear-gradient(135deg,#182830,#0e1418)", avatarColor: "#78b8d8" },
  { username: "i.popescu", role: "Art director · Bucharest", initial: "I", avatarBg: "linear-gradient(135deg,#281e2a,#140e18)", avatarColor: "#c8a0d0" },
  { username: "o.yilmaz", role: "Drone op · Istanbul", initial: "O", avatarBg: "linear-gradient(135deg,#2e2818,#1a160e)", avatarColor: "#d8c878" },
  { username: "z.müller", role: "Script supervisor · Berlin", initial: "Z", avatarBg: "linear-gradient(135deg,#202428,#101418)", avatarColor: "#b0b8c8" },
  { username: "n.foster", role: "Casting · Melbourne", initial: "N", avatarBg: "linear-gradient(135deg,#1a2830,#0e1418)", avatarColor: "#88c0d8" },
  { username: "q.ali", role: "Line producer · Cairo", initial: "Q", avatarBg: "linear-gradient(135deg,#302020,#1a1010)", avatarColor: "#e89888" },
  { username: "x.dubois", role: "Foley · Montreal", initial: "X", avatarBg: "linear-gradient(135deg,#22202e,#12101a)", avatarColor: "#b8b0e0" },
  { username: "u.schmidt", role: "Key grip · Munich", initial: "U", avatarBg: "linear-gradient(135deg,#243028,#141a18)", avatarColor: "#98c8a8" },
];

/** Long list for scroll / performance testing in followers & following modals (and tab views). */
export const MOCK_PROFILE_CONNECTIONS: MockConnection[] = (function () {
  const out: MockConnection[] = [];
  const target = 48;
  for (let i = 0; i < target; i++) {
    const base = MOCK_TEMPLATE[i % MOCK_TEMPLATE.length];
    const dup = Math.floor(i / MOCK_TEMPLATE.length);
    out.push({
      username: dup === 0 ? base.username : base.username + "." + dup,
      role: base.role,
      initial: base.initial,
      avatarBg: base.avatarBg,
      avatarColor: base.avatarColor,
    });
  }
  return out;
})();
