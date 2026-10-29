# Complete interview-outfit outerwear test

## Authorization and scope

The user explicitly approved Complete outfit test: 2 units on October 25, 2026. One new synthetic source image was generated. Exactly one additional paid YouCam render was attempted, with no automatic paid retry. The earlier upper-body test remains preserved separately in docs/LIVE_TEST.md and live-evidence.

## Verified result

- Provider: Perfect Corp YouCam
- Endpoint: /s2s/v2.0/task/cloth-v4
- Category: outer
- filter_multi_person: strict
- Started: 2026-10-25T10:23:00.749Z
- Finished: 2026-10-25T10:23:30.126Z
- End-to-end duration: approximately 29 seconds including result download
- Output: 1792 × 2400
- Current authenticated V4 price before the request: 2 units/result_image
- Observed cost: 2 units

The test exercised the existing Express API through a local private HTTP listener, including image validation, metadata normalization, consent, session ownership, provider file registration, upload, task creation, polling and result retrieval. The listener closed afterwards. No real credential was printed, inspected or persisted. The proxy supplied authentication on the documented provider API host.

## Inputs

Source: a newly generated fictional adult, matching the earlier synthetic demo character, shown head to toe wearing a white collared shirt, charcoal tailored trousers, black belt and black formal shoes. No blazer was present in the source. The source is generated, not a real person's photo.

Reference: the same synthetic navy blazer product image used in the earlier test. It contains one garment, not a composite collage.

## Visual review

The returned image shows the white shirt and its collar beneath the added navy blazer. The chest remains covered by the shirt. Charcoal trousers and black shoes remain visually consistent with the source. The subject's overall appearance, front-facing stance and neutral studio background remain broadly consistent.

This supports the documented outerwear route for this example. It is not proof of exact garment fidelity, pixel-perfect preservation, physical fit or reliability across subjects and garments. Because both the source outfit and category changed relative to the first run, the two runs are not a controlled single-variable experiment. The initial upper_body result should not be concealed or relabeled.

## Application changes

- Added outer to the server request enum and provider type.
- Outer requests send filter_multi_person: strict.
- The studio now defaults to the outerwear category and labels upper-body mode as replacement.
- Added automated tests for exact category forwarding and rejection of undocumented aliases.
- The live-test script takes a category and a separate evidence directory.
- The script writes an exclusive attempt marker and refuses to overwrite an existing verified run, preventing accidental reuse as an automatic paid retry.

## Evidence

- live-evidence/outer-test/synthetic-person.jpg
- live-evidence/outer-test/synthetic-blazer.jpg
- live-evidence/outer-test/youcam-result.jpg: full provider output, re-encoded to JPEG without visual retouching
- live-evidence/outer-test/inspection.jpg: resized copy for inspection only
- live-evidence/outer-test/verification.json: sanitized metadata and balance confirmation
- live-evidence/outer-test/attempt.json: local attempt guard, not a provider task receipt

Signed provider result URLs, authentication headers and the real API key are intentionally absent. The existing 62-second walkthrough predates both live tests. The static published preview still makes no live API calls.

## Official reference support

https://docs.perfectcorp.com/reference/ai_clothes/v4.0/paths/~1s2s~1v2.0~1task~1cloth-v4/post lists outer in the supported enum and strict in filter_multi_person.

https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear explains that outer layers jackets over clothing already present. It also documents the optional two-stage approach: base outfit first, then an outer request on that output. That two-stage approach was not run here.
