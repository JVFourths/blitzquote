import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { SocialProof } from "@/components/marketing/social-proof";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { Guarantee } from "@/components/marketing/guarantee";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { FAQ } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <HowItWorks />
        <Pricing />
        <Guarantee />
        <WaitlistForm />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
