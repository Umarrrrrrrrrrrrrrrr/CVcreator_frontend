import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import blank from "../assets/blank.webp";

export default function Help() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(
    () => [
      {
        id: 1,
        image: blank,
        name: t("home.testimonial1Name"),
        role: t("home.testimonial1Role"),
        quote: t("home.testimonial1Quote"),
      },
      {
        id: 2,
        image: blank,
        name: t("home.testimonial2Name"),
        role: t("home.testimonial2Role"),
        quote: t("home.testimonial2Quote"),
      },
      {
        id: 3,
        image: blank,
        name: t("home.testimonial3Name"),
        role: t("home.testimonial3Role"),
        quote: t("home.testimonial3Quote"),
      },
    ],
    [t]
  );

  const n = slides.length;

  const goPrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? n - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentSlide((prev) => (prev >= n - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50/90 via-white to-slate-50/80 py-16 md:py-24">
      {/* Soft ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[420px] w-[min(90vw,520px)] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100/40 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-indigo-100/30 blur-3xl" />
        <div className="absolute bottom-32 left-0 h-56 w-56 rounded-full bg-violet-100/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4">
        {/* Section header */}
        <div className="mb-10 text-center md:mb-12">
          <span className="mb-4 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 shadow-sm">
            {t("nav.about")}
          </span>
          <h2 className="mb-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
            {t("home.recommendSectionTitle")}
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-gray-600 md:text-[17px]">
            {t("home.recommendSectionSubtitle")}
          </p>
        </div>

        {/* Testimonial card */}
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-3xl border border-gray-200/90 bg-white/95 shadow-[0_2px_32px_-8px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03] backdrop-blur-sm">
            <div className="h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                style={{
                  width: `${n * 100}%`,
                  transform: `translateX(-${(currentSlide * 100) / n}%)`,
                }}
              >
                {slides.map((slide) => (
                  <article
                    key={slide.id}
                    className="box-border flex-shrink-0 px-6 py-7 sm:px-8 sm:py-8"
                    style={{ width: `${100 / n}%` }}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-center sm:gap-0">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-md" />
                          <img
                            src={slide.image}
                            alt=""
                            className="relative h-[72px] w-[72px] rounded-2xl object-cover shadow-md ring-[3px] ring-white sm:h-20 sm:w-20"
                          />
                        </div>
                        <div className="min-w-0 sm:hidden">
                          <p className="font-semibold text-gray-900">{slide.name}</p>
                          <p className="text-sm font-medium text-blue-600/85">{slide.role}</p>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="mb-3 hidden sm:block">
                          <p className="text-lg font-semibold leading-snug text-gray-900">{slide.name}</p>
                          <p className="mt-0.5 text-sm font-medium text-blue-600/85">{slide.role}</p>
                        </div>
                        <blockquote className="relative">
                          <span
                            className="absolute -left-0.5 -top-1 font-serif text-5xl leading-none text-blue-100/90 select-none"
                            aria-hidden
                          >
                            &ldquo;
                          </span>
                          <p className="relative pl-5 text-[15px] font-medium italic leading-[1.7] text-gray-600 sm:pl-6 sm:text-base">
                            {slide.quote}
                          </p>
                        </blockquote>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-gray-50/40 px-4 py-4">
              <button
                type="button"
                onClick={goPrev}
                aria-label={t("home.prevTestimonial")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5 px-2" role="tablist" aria-label="Testimonials">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === currentSlide}
                    aria-label={`${t("nav.about")} ${i + 1}`}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? "w-7 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm"
                        : "w-1.5 bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                aria-label={t("home.nextTestimonial")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
