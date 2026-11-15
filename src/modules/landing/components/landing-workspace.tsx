import type { CSSProperties } from "react";
import { ButtonLink } from "@/components/ui";
import { BrandMark } from "@/components/theme";
import { formatDate } from "@/lib/utils";
import { listCampuses } from "@/modules/classes/classes.service";
import { publicPosts } from "@/modules/posts/posts.service";
import { COURSES, FANPAGE_URL, FAQ, LOOP, PHRASES, QUOTES, TEACHERS, VALUES } from "@/modules/landing/landing.content";
import { LandingHeader } from "@/modules/landing/components/landing-header";
import { LandingPhoto } from "@/modules/landing/components/landing-photo";
import { LeadForm } from "@/modules/landing/components/lead-form";
import { PhoneDemo } from "@/modules/landing/components/phone-demo";

const wrap = "mx-auto w-[min(100%-32px,1180px)]";
const h2 = "font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold leading-tight tracking-tight";
const lead = "mt-2 max-w-2xl text-lg text-text-secondary";
const caption = "absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold";

/** Độ trễ cho hiệu ứng xuất hiện lần lượt (.gs-rise / .gs-float trong base.css). */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Chữ cái, dấu câu mờ trôi trên nền đỏ của hero. */
const HERO_GLYPHS = [
  { ch: "A", cls: "left-[2%] top-[6%] -rotate-12 text-[9rem]", d: 0 },
  { ch: "b", cls: "left-[43%] top-[2%] rotate-6 text-[7rem]", d: -2200 },
  { ch: "?", cls: "left-[39%] bottom-[3%] -rotate-6 text-[8rem]", d: -3600 },
  { ch: "!", cls: "right-[27%] top-[3%] rotate-12 text-[7rem]", d: -1200 },
  { ch: "C", cls: "right-[3%] bottom-[4%] rotate-12 text-[10rem]", d: -4500 },
] as const;

const PORTAL_POINTS = [
  ["8 dạng bài cho các con", "Trắc nghiệm, điền từ, nhìn hình, nối từ, nghe hiểu, sắp xếp câu, ghi âm đọc to, chụp ảnh bài viết."],
  ["Làm lại khi sai, có giới hạn thời gian", "Cô quyết định số lần làm và thời gian cho từng bài."],
  ["Cô biết ngay bé nào chưa làm, hay sai phần nào", "Điểm từng bé, danh sách chưa nộp và phân tích theo kỹ năng."],
  ["Phụ huynh xem điểm và nhận xét của con", "Đăng nhập bằng số điện thoại đã đăng ký với trung tâm."],
] as const;

/** Trang giới thiệu trung tâm — bố cục theo file đề xuất của bạn Biển (hero → … → form). */
export async function LandingWorkspace() {
  const [campuses, posts] = await Promise.all([listCampuses(), publicPosts()]);
  const hotline = campuses[0]?.phone.replace(/\s/g, "") ?? "";

  return (
    <div className="bg-surface text-foreground" data-color-mode="light">
      <div className="bg-[#1f2544] px-4 py-1.5 text-center text-xs text-white">
        Bản demo – ảnh, địa chỉ, giáo viên, cảm nhận là dữ liệu mẫu, sẽ thay bằng thông tin thật của trung tâm.{" "}
        <a href="/login" className="font-semibold text-wood-300 underline">Vào cổng học tập</a>
      </div>
      <LandingHeader />

      <main>
        {/* ── Hero: bong bóng hội thoại trên nền đỏ thương hiệu ── */}
        <section className="relative isolate overflow-hidden bg-[radial-gradient(130%_100%_at_85%_0%,var(--color-brand-500),var(--color-brand-600)_42%,var(--color-brand-800))] text-on-primary">
          {/* Nền đỏ động: mảng sáng tối trôi chậm, chữ cái mờ, máy bay giấy bay theo đường nét đứt như trong logo */}
          <div aria-hidden className="absolute inset-0 -z-10">
            <span className="gs-drift absolute -left-40 -top-40 size-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(255_120_140/.5),transparent)]" />
            <span className="gs-drift absolute -bottom-56 right-[-8%] size-[700px] rounded-full bg-[radial-gradient(closest-side,rgb(90_5_20/.55),transparent)]" style={delay(-9000)} />
            {HERO_GLYPHS.map((g) => (
              <span key={g.ch} className={`gs-float absolute font-display font-extrabold leading-none text-white/[0.08] ${g.cls}`} style={delay(g.d)}>{g.ch}</span>
            ))}
            <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
              <path id="gs-plane-path" d="M-60 95 C 200 -20, 520 60, 640 40 C 725 28, 690 300, 702 420 C 712 560, 1000 600, 1270 430" fill="none" stroke="rgb(255 255 255 / .38)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 11" />
              <g fill="#fff">
                <polygon points="16,0 -16,-12 -9,0" />
                <polygon points="16,0 -16,12 -9,0" opacity=".72" />
                <animateMotion dur="18s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#gs-plane-path" />
                </animateMotion>
              </g>
            </svg>
          </div>
          <div className={`${wrap} relative grid items-center gap-14 py-12 lg:grid-cols-[1.15fr_.85fr] lg:py-20`}>
            <div>
              <div className="gs-pop relative rounded-[32px] bg-white px-6 py-7 text-[#1f2544] shadow-[0_18px_0_rgba(0,0,0,.12)] sm:px-10 sm:py-9">
                <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.9rem)] font-extrabold leading-[1.1] tracking-tight">
                  Con tự tin{" "}
                  <span className="relative isolate whitespace-nowrap sm:block sm:w-fit">
                    cất tiếng nói
                    <svg aria-hidden viewBox="0 0 300 14" preserveAspectRatio="none" className="gs-underline absolute -inset-x-1.5 bottom-[0.08em] -z-10 h-[0.42em] w-[calc(100%+0.75rem)]">
                      <path d="M5 8 C 80 5, 200 9, 295 6" pathLength={1} />
                    </svg>
                  </span>{" "}
                  bằng tiếng Anh.
                </h1>
                <p className="mt-5 max-w-[46ch] text-lg text-[#4a5072]">
                  Tiếng Anh thiếu nhi và giao tiếp 4 kỹ năng. Lớp nhỏ, học qua trò chơi, bài tập online mỗi tuần
                  và bố mẹ xem được tiến bộ của con.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <ButtonLink href="#dang-ky" size="xl" className="rounded-full shadow-[0_4px_0] shadow-brand-800 hover:-translate-y-0.5 hover:shadow-[0_6px_0] hover:shadow-brand-800">
                    Đăng ký học thử miễn phí
                  </ButtonLink>
                  <a href="#khoa-hoc" className="font-semibold underline decoration-wood-400 decoration-2 underline-offset-4 hover:text-primary">
                    Xem các khóa học
                  </a>
                </div>
                <span aria-hidden className="absolute -bottom-8 left-16 h-10 w-14 bg-white [clip-path:polygon(0_0,100%_0,10%_100%)]" />
              </div>
              <p className="gs-rise mt-14 pl-2 text-on-primary/90" style={delay(500)}>
                Hơn <b className="font-display text-xl text-white">300</b> học viên,{" "}
                <b className="font-display text-xl text-white">10</b> giáo viên,{" "}
                <b className="font-display text-xl text-white">2</b> cơ sở tại Hà Nội.
              </p>
            </div>
            <div aria-hidden className="relative hidden min-h-[420px] lg:block">
              <div className="gs-rise absolute right-0 top-0 w-[72%]" style={delay(250)}>
                <figure className="gs-float rotate-3 rounded-md bg-white p-2.5 pb-10 text-[#1f2544] shadow-xl transition-[rotate] duration-300 hover:rotate-0">
                  <LandingPhoto file="hero-1.jpg" hint="Ảnh bé thuyết trình (lấy từ fanpage)" tint="bg-red-50" className="aspect-[4/3] rounded" />
                  <figcaption className="absolute inset-x-0 bottom-2 text-center font-display text-lg">My dream job!</figcaption>
                </figure>
              </div>
              <div className="gs-rise absolute bottom-0 left-0 w-[56%]" style={delay(400)}>
                <figure className="gs-float -rotate-[5deg] rounded-md bg-white p-2.5 pb-10 text-[#1f2544] shadow-xl transition-[rotate] duration-300 hover:rotate-0" style={delay(-3000)}>
                  <LandingPhoto file="hero-2.jpg" hint="Ảnh lớp học" tint="bg-amber-50" className="aspect-[4/3] rounded" />
                  <figcaption className="absolute inset-x-0 bottom-2 text-center font-display text-lg">Speaking club</figcaption>
                </figure>
              </div>
              <div className="gs-float absolute left-[6%] top-[4%] z-10" style={delay(-1500)}>
                <p className="gs-pop rounded-2xl rounded-bl-sm bg-wood-300 px-4 py-2 font-display text-xl font-bold text-[#1f2544] shadow-lg" style={delay(900)}>Hello!</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dải câu các con nói được ── */}
        <div aria-hidden className="relative z-10 -mt-7 overflow-x-clip">
          <div className="-mx-6 -rotate-1 bg-wood-300 py-3 font-display text-xl font-bold text-[#1f2544] shadow-md">
            <div className="gs-marquee">
              {[0, 1].map((n) => (
                <div key={n} className="flex shrink-0">
                  {PHRASES.map((p) => (
                    <span key={p} className="flex items-center whitespace-nowrap">
                      <span className="px-6">{p}</span>
                      <span className="size-2 rounded-full bg-primary" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Về GoSpeak ── */}
        <section id="gioi-thieu" className="scroll-mt-20 py-20">
          <div className={`${wrap} grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]`}>
            <LandingPhoto file="about.jpg" hint="Ảnh cơ sở / tập thể giáo viên" tint="bg-amber-50" className="gs-reveal aspect-[5/4] rounded-3xl" />
            <div>
              <h2 className={h2}>Không chỉ học tiếng Anh, mà là dám nói tiếng Anh</h2>
              <p className="mt-3 text-lg text-text-secondary">
                GoSpeak English giúp các con dùng tiếng Anh trong đời sống: chào hỏi, kể chuyện, trình bày ý kiến trước lớp.
                Mỗi buổi học đều có phần con được nói, được sửa và được khen.
              </p>
              <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {VALUES.map((v) => (
                  <div key={v.title} className="border-t-2 border-wood-300 pt-3">
                    <dt className="font-display text-xl font-bold">{v.title}</dt>
                    <dd className="mt-1 text-text-secondary">{v.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── Khóa học + phương pháp ── */}
        <section id="khoa-hoc" className="scroll-mt-20 bg-surface-subtle py-20">
          <div className={wrap}>
            <h2 className={h2}>Khóa học theo độ tuổi</h2>
            <p className={lead}>Bé được kiểm tra đầu vào miễn phí để xếp đúng lớp. Mỗi lớp tối đa 12–14 bạn để giáo viên theo sát từng con.</p>
            <div className="gs-reveal mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {COURSES.map((c) => (
                <article key={c.name} className="group relative flex flex-col overflow-hidden rounded-card bg-surface p-6 ring-1 ring-line transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 origin-left scale-x-[.22] transition-transform duration-300 group-hover:scale-x-100" style={{ background: c.color }} />
                  <span className="text-sm font-bold" style={{ color: c.color }}>{c.age}</span>
                  <h3 className="mt-1 font-display text-2xl font-bold">{c.name}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{c.desc}</p>
                  <ul className="mt-3 mb-5 list-disc space-y-1 pl-5 text-sm text-text-secondary">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  <a href="#dang-ky" className="mt-auto text-sm font-semibold underline-offset-4 hover:underline" style={{ color: c.color }}>Học thử lớp này</a>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">Học phí theo từng khóa. Bố mẹ để lại số điện thoại, trung tâm sẽ báo chi tiết.</p>

            <div id="phuong-phap" className="scroll-mt-24 pt-20">
              <h2 className={h2}>Mỗi tuần, con đi trọn một vòng học</h2>
              <p className={lead}>Học trên lớp chưa đủ. Ở GoSpeak, bài học được nối từ lớp học về nhà và quay lại lớp, để cô biết con cần kèm thêm phần nào.</p>
              <ol className="mt-10 grid gap-7 lg:grid-cols-4 lg:gap-0">
                {LOOP.map((s, i) => (
                  <li key={s.title} className="relative pl-[72px] lg:pl-0 lg:pr-6">
                    <span className="absolute left-0 top-0 z-10 grid size-[52px] place-items-center rounded-full bg-primary font-display text-2xl font-extrabold text-on-primary ring-[6px] ring-surface-subtle lg:static lg:mb-4">{i + 1}</span>
                    {i < LOOP.length - 1 && <span aria-hidden className="absolute left-[25px] top-[52px] -bottom-7 border-l-[3px] border-dashed border-brand-200 lg:left-[52px] lg:right-0 lg:top-[26px] lg:bottom-auto lg:border-l-0 lg:border-t-[3px]" />}
                    <h3 className="font-display text-xl font-bold">{s.title}</h3>
                    <p className="mt-1 text-text-secondary">{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Cổng học tập ── */}
        <section className="bg-blue-50 py-20">
          <div className={`${wrap} grid items-center gap-14 lg:grid-cols-2`}>
            <div>
              <h2 className={h2}>Bài tập về nhà ngay trên điện thoại</h2>
              <p className={lead}>Mỗi học viên có một tài khoản riêng. Không cần cài ứng dụng, mở trình duyệt là làm bài được.</p>
              <ul className="mt-7 space-y-5">
                {PORTAL_POINTS.map(([t, d]) => (
                  <li key={t} className="border-l-[3px] border-blue-200 pl-4">
                    <b className="block text-lg">{t}</b>
                    <span className="text-text-secondary">{d}</span>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/login" size="lg" className="mt-8 rounded-full">Xem thử cổng học tập</ButtonLink>
            </div>
            <div className="gs-reveal pt-6"><PhoneDemo /></div>
          </div>
        </section>

        {/* ── Giáo viên ── */}
        <section id="giao-vien" className="scroll-mt-20 py-20">
          <div className={wrap}>
            <h2 className={h2}>Thầy cô của các con</h2>
            <p className={lead}>10 giáo viên Việt Nam và bản ngữ, có chứng chỉ giảng dạy và kinh nghiệm dạy thiếu nhi.</p>
            <div className="gs-reveal mt-10 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {TEACHERS.map((t) => (
                <article key={t.name} className="group relative">
                  <p aria-hidden className="absolute -top-3 left-[38%] z-10 origin-bottom-left scale-0 whitespace-nowrap rounded-2xl rounded-bl-sm bg-[#1f2544] px-3.5 py-1.5 font-display text-base font-bold text-white opacity-0 shadow-lg transition-[scale,opacity] duration-300 ease-[cubic-bezier(.2,1.4,.4,1)] group-hover:scale-100 group-hover:opacity-100 [@media(hover:none)]:scale-100 [@media(hover:none)]:opacity-100">
                    {t.hi}
                  </p>
                  <LandingPhoto file={t.photo} tint="bg-brand-50" className="mb-4 aspect-square rounded-t-full rounded-b-3xl transition-[translate] duration-300 group-hover:-translate-y-1.5" alt={t.name} />
                  <h3 className="font-display text-xl font-bold">{t.name}</h3>
                  <p className="text-sm font-semibold text-primary">{t.role}</p>
                  <p className="mt-1 text-sm text-text-secondary">{t.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Hoạt động ── */}
        <section id="hoat-dong" className="scroll-mt-20 bg-surface-subtle py-20">
          <div className={wrap}>
            <h2 className={h2}>Hoạt động của các con</h2>
            <p className={lead}>Thuyết trình, ngoại khóa, lễ hội và câu lạc bộ nói tiếng Anh.</p>
            <div className="gs-reveal mt-10 grid auto-rows-[140px] grid-cols-2 gap-3.5 md:auto-rows-[180px] md:grid-cols-4">
              <LandingPhoto file="hd-1.jpg" tint="bg-red-50" className="col-span-2 row-span-2 rounded-card">
                <span className={caption}>Video: Bé Minh Anh giới thiệu gia đình</span>
              </LandingPhoto>
              <LandingPhoto file="hd-2.jpg" tint="bg-amber-50" className="rounded-card"><span className={caption}>Halloween</span></LandingPhoto>
              <LandingPhoto file="hd-3.jpg" tint="bg-green-50" className="rounded-card"><span className={caption}>Cuộc thi hùng biện</span></LandingPhoto>
              <LandingPhoto file="hd-4.jpg" tint="bg-blue-50" className="col-span-2 rounded-card"><span className={caption}>Giáng sinh</span></LandingPhoto>
            </div>
          </div>
        </section>

        {/* ── Cảm nhận ── */}
        <section className="py-20">
          <div className={wrap}>
            <h2 className={h2}>Phụ huynh nói gì về GoSpeak</h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {QUOTES.map((q, i) => (
                <blockquote key={q.name} className={`flex flex-col rounded-3xl rounded-bl-md bg-wood-50 p-6 transition-[rotate,translate,box-shadow] duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-lg ${i % 2 ? "lg:translate-y-4 lg:rotate-1" : "lg:-rotate-1"}`}>
                  <p className="text-lg leading-relaxed">“{q.text}”</p>
                  <footer className="mt-auto pt-5 text-sm text-muted">
                    <b className="block text-foreground">{q.name}</b>{q.who}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tin tức & khai giảng (quản lý đăng trong cổng học tập) ── */}
        <section id="tin-tuc" className="scroll-mt-20 bg-surface-subtle py-20">
          <div className={wrap}>
            <h2 className={h2}>Tin tức và lịch khai giảng</h2>
            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <div className="rounded-3xl bg-[#1f2544] p-7 text-white">
                <h3 className="font-display text-2xl font-bold">Lịch khai giảng sắp tới</h3>
                {posts.openings.length ? posts.openings.map((p) => (
                  <div key={p.id} className="mt-4 grid grid-cols-[64px_1fr] gap-3.5 border-t border-white/15 pt-4">
                    <div className="self-start rounded-xl bg-wood-400 py-1.5 text-center font-display leading-tight text-[#1f2544]">
                      <b className="block text-2xl">{p.eventDate.getDate()}</b><small>Th{p.eventDate.getMonth() + 1}</small>
                    </div>
                    <div>
                      <h4 className="font-semibold">{p.title}</h4>
                      <p className="text-sm text-white/70">{p.campus?.name ?? "Cả 2 cơ sở"}</p>
                      <p className="text-sm text-white/85">{p.body}</p>
                    </div>
                  </div>
                )) : <p className="mt-3 opacity-80">Lịch khai giảng mới sẽ được cập nhật sớm. Bố mẹ để lại số điện thoại để được báo trước.</p>}
                <a href="#dang-ky" className="mt-6 inline-block rounded-full bg-wood-400 px-5 py-2.5 font-semibold text-[#1f2544] transition-[translate,background-color] hover:-translate-y-0.5 hover:bg-wood-300">Giữ chỗ cho con</a>
              </div>
              <div className="divide-y divide-line">
                {posts.news.map((p) => (
                  <article key={p.id} className="py-5 first:pt-0 last:pb-0">
                    <p className="text-sm text-muted">
                      <span className="font-semibold text-primary">{p.kind === "EVENT" ? "Sự kiện" : "Góc phụ huynh"}</span>
                      <span className="ml-2.5">{formatDate(p.eventDate)}</span>
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{p.title}</h3>
                    <p className="mt-1 text-text-secondary">{p.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Hỏi đáp ── */}
        <section className="py-20">
          <div className={`${wrap} max-w-[820px]`}>
            <h2 className={h2}>Câu hỏi bố mẹ hay hỏi</h2>
            <div className="mt-6">
              {FAQ.map((f) => (
                <details key={f.q} className="gs-faq group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="font-display text-2xl leading-none text-primary transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-text-secondary">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cơ sở + form đăng ký ── */}
        <section id="lien-he" className="scroll-mt-20 bg-blue-50 py-20">
          <div className={`${wrap} grid items-start gap-10 lg:grid-cols-2`}>
            <div>
              <h2 className={h2}>Hai cơ sở tại Hà Nội</h2>
              <p className="mt-2 mb-6 text-lg text-text-secondary">Bố mẹ chọn cơ sở gần nhà, lịch học linh hoạt trong tuần và cuối tuần.</p>
              <div className="space-y-4">
                {campuses.map((c) => (
                  <div key={c.id} className="rounded-card bg-surface px-5 py-4 ring-1 ring-line">
                    <h3 className="font-display text-xl font-bold">{c.name}</h3>
                    <p className="text-text-secondary">{c.address}</p>
                    <p className="mt-1 text-sm text-muted">
                      <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="font-semibold text-primary hover:underline">{c.phone}</a>
                      <span className="ml-3">{c.hours}</span>
                    </p>
                  </div>
                ))}
              </div>
              <iframe title="Bản đồ cơ sở GoSpeak" loading="lazy" className="mt-5 h-64 w-full rounded-card border-0" src="https://maps.google.com/maps?q=H%C3%A0%20N%E1%BB%99i&z=12&output=embed" />
            </div>
            <div id="dang-ky" className="scroll-mt-24 rounded-3xl border-t-8 border-wood-400 bg-surface p-6 shadow-xl sm:p-8">
              <LeadForm campuses={campuses.map((c) => ({ id: c.id, name: c.name }))} />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#1f2544] pb-24 pt-14 text-sm text-white/80">
        <div className={`${wrap} grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5"><BrandMark size="md" /><span className="font-display text-xl font-extrabold text-white">GoSpeak English</span></div>
            <p className="mt-3">Không chỉ học tiếng Anh, mà còn giúp con tự tin cất lên tiếng nói của mình.</p>
          </div>
          <div><h4 className="mb-3 font-semibold text-white">Khóa học</h4>{COURSES.map((c) => <a key={c.name} href="#khoa-hoc" className="block py-0.5 hover:text-white">{c.name}</a>)}</div>
          <div><h4 className="mb-3 font-semibold text-white">Trung tâm</h4>{[["#gioi-thieu", "Về GoSpeak"], ["#giao-vien", "Giáo viên"], ["#hoat-dong", "Hoạt động"], ["#tin-tuc", "Tin tức"]].map(([h, l]) => <a key={h} href={h} className="block py-0.5 hover:text-white">{l}</a>)}</div>
          <div><h4 className="mb-3 font-semibold text-white">Kết nối</h4><a href={FANPAGE_URL} target="_blank" rel="noreferrer" className="block py-0.5 hover:text-white">Fanpage Facebook</a><a href="#lien-he" className="block py-0.5 hover:text-white">Zalo OA</a><a href="/login" className="block py-0.5 hover:text-white">Cổng học tập</a></div>
        </div>
      </footer>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 text-sm font-semibold text-white">
        <a href={`tel:${hotline}`} className="rounded-full bg-success px-4 py-2.5 shadow-lg transition-[translate] hover:-translate-y-0.5">Gọi tư vấn</a>
        <a href="#lien-he" className="rounded-full bg-[#0068ff] px-4 py-2.5 shadow-lg transition-[translate] hover:-translate-y-0.5">Nhắn Zalo</a>
      </div>
    </div>
  );
}
