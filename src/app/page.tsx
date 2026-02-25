"use client";

import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import WhyDubai from "@/components/WhyDubai";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const SECTIONS = ["about", "services", "why-dubai", "contact"] as const;

export default function Page() {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  // highlight current section (track active via IntersectionObserver but not used in render)
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      () => { /* active tracking unused */ },
      { threshold: 0.5 }
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
      refs.current[id] = el;
    });
    return () => io.disconnect();
  }, []);

  const scrollTo = (id: (typeof SECTIONS)[number]) =>
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero
        onPrimary={() => scrollTo("contact")}
        onSecondary={() => scrollTo("services")}
      />
      <section id="about">
        <About />
      </section>
      <section id="services">
        <Services onEnquire={() => scrollTo("contact")} />
      </section>
      <section id="why-dubai">
        <WhyDubai />
      </section>
      <section id="contact">
        <Contact />
      </section>
      <Footer />
    </main>
  );
}
