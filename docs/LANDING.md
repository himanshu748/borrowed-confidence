# Active demo update — October30,2026

The active native video modal now uses src/media/final-demo.mp4: the fresh160-second continuous application recording with Deepgram narration and English captions. It includes the actual authorized October30 YouCam request, visual comparison, rejection/recalculation and budget gap. The recording identifies private local live execution versus public historical replay. The old src/media/walkthrough.mp4 and its checksummed bundle remain preserved as historical evidence. Video loading remains preload=none; playback never starts a provider request. Keyboard dialog closure/focus and mobile playback are regression checked with the new asset.

# Finalization update — October 30, 2026

The primary action now opens the working planner immediately. The 62-second modal is retained as an explicitly historical walkthrough. The connected studio supports exact garment/event context, genuine historical before/after replay, acceptance/rejection and actual replanning. Pine/editorial styling is preserved, with measured contrast fixes. The final narrated160-second judging video is https://www.youtube.com/watch?v=MSZC_hIJOiA and shows a fresh real authorized request through the updated UI. Public rendering stays disabled to bound costs.

The original design/media record follows; historical wording about primary CTA predates this finalization.

# Landing page and media notes

## Direction

Premium campus editorial, chosen by the user. The primary action is Watch the walkthrough, not a waitlist or purchase. Hard white surfaces, pine-green typography, a chartreuse opportunity ticket and candid stock portraits give the project a distinctive launch identity without inventing a university affiliation.

The page lives at the root. The working planner lives at #planner. Home returns to the landing page. Core files are src/Landing.tsx, src/landing.css and src/Garment.tsx.

## Working actions

- Watch the walkthrough opens a native modal and plays an actual 61.9-second product recording.
- Native video controls allow pause, seek and mute. The recording has on-screen captions and a text transcript in the modal.
- Closing the dialog pauses playback, restores scroll and returns focus to the trigger. Escape uses the browser's native dialog behavior.
- The interactive sample uses the exact same makePlan function as the full app. The availability toggle produces the ₹850 stockout alternative. Lower budgets honestly expose uncovered events.
- Secondary actions open the full planner, not a dead-end signup.
- Mobile menu, in-page navigation, native FAQ disclosures and photography credits work.
- No form collects emails or pretends to store a waitlist.

## Video provenance

The browser recording shows the real earlier prototype with fictional inventory. It shows the initial plan, a stockout replan, the shortlist and the disabled live try-on studio. It is not a live YouCam demo or the final hackathon submission video. The recording was captured in this project thread on October 25, 2026. The original is preserved as a thread video asset. An optimized H.264 copy is bundled as src/media/walkthrough.mp4, approximately 514 KB, 1280 × 720, 61.9 seconds. No third-party music or voice is included.

In production, video is a separate cached asset and uses preload=none. Only the self-contained review artifact embeds media as data URLs. The static artifact never calls the backend.

## Photography rights and credits

The photos are editorial stock imagery, not actual users, students verified by this project or product endorsements. No image is used as a testimonial. The image subjects are not assigned personal stories, financial circumstances or outcomes. The photos are not submitted to YouCam.

1. Huyen Quang, Young Professional in Formal Business Attire Outdoors.
   Source: https://www.pexels.com/photo/young-professional-in-formal-business-attire-outdoors-35107758/
   Image: https://images.pexels.com/photos/35107758/pexels-photo-35107758.jpeg
   Local: src/media/portrait-a.jpg

2. Laura Beauty Designer, Stylish Portrait of Young Woman in Blazer.
   Source: https://www.pexels.com/photo/stylish-portrait-of-young-woman-in-blazer-33717108/
   Image: https://images.pexels.com/photos/33717108/pexels-photo-33717108.jpeg
   Local: src/media/portrait-b.jpg

Pexels License checked October 25, 2026: https://www.pexels.com/license/
The license allows free use and modification. It prohibits implying endorsement, offensive portrayals and certain resale or redistribution uses. The project uses these as website illustration. Credits are also available in the footer. The photos remain subject to their original license, not the source-code MIT license.

Garment illustrations and the wordmark are newly drawn in code. No fake copyright notice or university logo is used. Google Fonts serve Manrope and DM Sans with sans-serif fallbacks.

## Release honesty

The page says what works and what is pending. Two synthetic-input live tests are now verified and disclosed, including one outerwear example that visually retained the base shirt. The video predates that test; it does not demonstrate a live render. No testimonials, measured environmental benefits, university partnerships or guaranteed career outcomes are claimed. All displayed stock and prices are sample data. The product does not purchase or reserve items.
