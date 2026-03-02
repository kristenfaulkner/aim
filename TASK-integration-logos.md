# Task: Download Official Integration Logos for AIM Connect Apps Page

## Important: Use Official Brand Assets

For each integration, you MUST download logos from the company's official developer/brand guidelines page. Do NOT use third-party sources like Brandfetch. Many of these companies have strict brand requirements for API partners — follow them exactly.

## Step 1: Download official logos from these sources

Search the web for each company's official developer brand guidelines or press kit. Download their official app icon or logo mark (the square icon version, not the full wordmark). Here are known brand guideline URLs to start with — but verify these are still current:

### Training & Activity

1. **Strava**
   - Brand guidelines: `https://developers.strava.com/guidelines/`
   - REQUIRED: Must use official "Connect with Strava" button for OAuth. Download from their guidelines page.
   - REQUIRED: Must display "Powered by Strava" logo when showing Strava data.
   - For the card icon: use their official app icon (orange with white arrow)
   - Download their full asset kit (EPS, SVG, PNG available)

2. **Wahoo**
   - Search for: "Wahoo Fitness developer brand assets" or "Wahoo Cloud API branding"
   - Use the blue Wahoo ELEMNT icon or the Wahoo "W" mark
   - If no official dev assets exist, use the app store icon

3. **Garmin**
   - Brand guidelines: `https://developer.garmin.com/brand-guidelines/overview/`
   - Connect brand assets: `https://developer.garmin.com/brand-guidelines/connect/`
   - REQUIRED: Must use official "Works with Garmin Connect" badge
   - Download their approved logo files from the developer portal
   - For the card icon: use the Garmin Connect tile/icon they provide

4. **TrainingPeaks**
   - Search for: "TrainingPeaks developer API brand assets"
   - Use their official icon mark

5. **Zwift**
   - Search for: "Zwift brand assets press kit"
   - Use the orange Zwift icon

6. **TrainerRoad**
   - Search for: "TrainerRoad press kit brand assets"
   - Use their app icon (red TR mark)

7. **Intervals.icu**
   - Search for: "Intervals.icu logo assets"
   - Community project — may not have formal guidelines. Use their favicon or app icon.

8. **Hammerhead**
   - Search for: "Hammerhead Karoo brand assets press kit"
   - Use the Hammerhead icon

### Recovery & Sleep

9. **Oura Ring**
   - Search for: "Oura developer API brand guidelines"
   - Also check: `https://cloud.ouraring.com/` for developer resources
   - Use the Oura ring icon/mark

10. **Whoop**
    - Brand guidelines: `https://developer.whoop.com/docs/developing/design-guidelines/`
    - Full brand PDF: `https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines.pdf`
    - REQUIRED: Follow their design guidelines for logo usage
    - Download official logos from their developer docs (SVG, PNG, PDF available)

11. **EightSleep**
    - Search for: "Eight Sleep brand assets press kit"
    - Use their app icon

### Body Composition

12. **Withings**
    - Search for: "Withings developer API brand guidelines"
    - Also check: `https://developer.withings.com/`
    - Use the Withings icon mark

### Nutrition

13. **MyFitnessPal**
    - Search for: "MyFitnessPal brand assets press kit"
    - Use their blue app icon

14. **Cronometer**
    - Search for: "Cronometer logo brand assets"
    - Use their app icon

15. **Hexis**
    - Search for: "Hexis nutrition app logo"
    - Use their app icon

16. **Noom**
    - Search for: "Noom brand assets press kit"
    - Use their green app icon

### Advanced

17. **Apple Health**
    - Search for: "Apple Health developer brand guidelines"
    - Apple has STRICT brand requirements: `https://developer.apple.com/app-store/marketing/guidelines/`
    - Use the official Apple Health icon (heart on white background)
    - Do NOT modify Apple's icon in any way

18. **Supersapiens / Abbott Lingo**
    - Search for: "Abbott Lingo brand assets" or "Supersapiens logo"
    - Company rebranded from Supersapiens to Abbott Lingo
    - Use their current app icon

## Step 2: Process all logos

For each downloaded logo:
1. Resize to exactly **80x80 pixels** (square)
2. Save as PNG with transparent background where possible
3. If the logo is a full wordmark, crop to just the icon/symbol portion
4. Filename format: lowercase, no spaces — `strava.png`, `wahoo.png`, `garmin.png`, etc.
5. Save all to `/public/images/integrations/`

If you absolutely cannot find an official icon for any app, create a clean placeholder:
- 80x80 with the app's brand color background
- Rounded corners (16px radius)
- First 1-2 letters in white, bold, centered
- Save as the same filename format

## Step 3: Save official "Connect with" buttons separately

Some companies require specific OAuth buttons. Save these full-size (do not resize) to `/public/images/integrations/buttons/`:
- `btn-connect-strava.png` — Official "Connect with Strava" button (orange version)
- `btn-connect-strava-white.png` — Official "Connect with Strava" button (white version)
- `btn-works-with-garmin.png` — Official "Works with Garmin Connect" badge
- Any other official connect/badge assets you find

## Step 4: Update the Connect Apps page component

Replace each colored circle placeholder with the real logo:

```jsx
<img 
  src={`/images/integrations/${provider}.png`} 
  alt={`${name} logo`}
  className="w-10 h-10 rounded-lg object-contain"
/>
```

For Strava specifically, replace the generic "Connect" button with the official "Connect with Strava" button image when initiating OAuth:

```jsx
{provider === 'strava' ? (
  <img 
    src="/images/integrations/buttons/btn-connect-strava.png" 
    alt="Connect with Strava"
    className="h-12 cursor-pointer"
    onClick={handleStravaConnect}
  />
) : (
  <button className="...">Connect</button>
)}
```

## Step 5: Add "Powered by" attributions

Where required, add attribution badges to the appropriate data views:
- Show "Powered by Strava" on any view displaying Strava-sourced data
- Show Garmin Connect attribution on any view displaying Garmin data
- Follow each company's specific attribution requirements from their brand guidelines

Save attribution logos to `/public/images/integrations/attribution/`:
- `powered-by-strava.png`
- `garmin-connect-attribution.png`
- Any other required attribution marks
