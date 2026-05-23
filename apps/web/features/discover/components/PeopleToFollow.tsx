import { UserCard } from "@/components/UserCard";

const PEOPLE = [
  {
    username: "k.szabo",
    role: "Editor · Budapest",
    initial: "K",
    avatarBg: "linear-gradient(135deg,#2d3a4a,#1a2530)",
    avatarColor: "#7a9eb0",
  },
  {
    username: "nora.dop",
    role: "DP · Paris",
    initial: "N",
    avatarBg: "linear-gradient(135deg,#2a1e30,#3a2a40)",
    avatarColor: "#9a7ab0",
  },
  {
    username: "t.osei",
    role: "Director · Accra",
    initial: "T",
    avatarBg: "linear-gradient(135deg,#1e2a1a,#2a3a22)",
    avatarColor: "#7a9e6a",
  },
];

export function PeopleToFollow() {
  return (
    <div className="mb-7">
      <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
        Filmmakers to follow
      </div>
      {PEOPLE.map((p) => (
        <UserCard
          key={p.username}
          username={p.username}
          handle={`@${p.username}`}
          role={p.role}
          initial={p.initial}
          avatarBg={p.avatarBg}
          avatarColor={p.avatarColor}
          showFollowButton
        />
      ))}
    </div>
  );
}
