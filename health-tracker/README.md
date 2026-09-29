# Fuel & Form

A personal health and fitness website. It works out your daily calorie, protein, carb, fat and water needs from your height, weight and goal. It tracks the meals you type in plain words against those targets and gives you a weekly workout plan. Recipe and exercise links open on YouTube.

It is a **separate website** from the rest of this repository. It's a single static page (`index.html`) with no build step, no server, no accounts and no dependencies. It doesn't share code, styles or deployment with the Next.js app at the repo root.

## Features

| Tab | What it does |
|---|---|
| **Today** | Type a meal in plain words, e.g. `3 eggs, 2 roti, 1 bowl dal, 150g chicken, 500 ml water`. It knows about 100 common Indian and Western foods and understands g, kg, ml, L, oz, lb, cup, bowl, plate, glass, slice, piece, tbsp, tsp and scoop. It shows a nutrition-label panel of calories, protein, carbs, fat and water against your targets, with tips on what to eat next. **Eat this again** re-adds a recent meal with one tap. Foods it doesn't know can be saved as your own foods. |
| **Recipes** | 26 high-protein breakfast, lunch, dinner and snack recipes. They're filtered by your diet (vegetarian, vegetarian + egg, or non-vegetarian) and sorted by how well they fit the calories and protein you have left today. Each recipe has an **Add to today** button and a **Watch recipe** YouTube link. |
| **Workout plan** | A weekly plan based on your goal, training days (2–6), experience and whether you train at a gym or at home. It gives sets × reps, rest times and cardio. Every exercise name links to a YouTube form tutorial, and every day has a follow-along workout video link. **Mark done** on today's session records the workout and adds 500 ml to your water target. |
| **Progress** | A body weight trend chart with your goal line, charts of calories and protein for the last 7 days against target, your logging streak, average calories and workouts this week. |
| **My targets** | Your details: sex, age, height, weight, goal weight, goal, activity, training days, experience, gym or home, and diet. It shows your targets and how they were calculated. It also has backup, restore and delete for your data. |

### How the numbers are calculated

- **Calories:** Mifflin–St Jeor BMR × activity factor, then −20% to lose fat, +10% to build muscle, or unchanged to maintain. There's a floor of 1,500 kcal for men and 1,200 kcal for women.
- **Protein:** 2.0 g/kg to lose fat, 1.8 g/kg to build muscle, 1.6 g/kg to maintain. If your BMI is over 30, it uses the weight you'd have at a BMI of 27 instead.
- **Fat:** about 27% of calories, and at least 0.6 g/kg.
- **Carbs:** whatever calories are left.
- **Water:** 35 ml/kg, plus 500 ml on workout days.
- **Fibre:** 14 g per 1,000 kcal.

These are estimates. The site isn't medical advice.

## Privacy and sharing with friends

- Everything you enter is stored only in your own browser (`localStorage`). Nothing is sent to a server.
- If you share the link with friends, each of them gets their own blank copy with their own targets and logs. They can't see your data and you can't see theirs.
- To move your data to another device, use **My targets → Your data → Copy backup**, then **Restore from backup** on the other device.

## YouTube links

The recipe and workout links open YouTube searches, such as "bench press proper form how to" or "paneer bhurji recipe". They don't point to single videos, so they never break when a video is taken down, and you can pick a creator you like.

## Run it locally

Open `health-tracker/index.html` in any browser. Or serve the folder:

```bash
npx serve health-tracker
```

## Host it as its own website

Any static host works. Point it at the `health-tracker/` folder so it stays separate from the main site:

- **Vercel:** New Project → import this repo → set **Root Directory** to `health-tracker` → Framework preset **Other** → Deploy.
- **Netlify:** Add new site → import this repo → **Base directory** `health-tracker`, leave the build command empty, publish directory `health-tracker`.
- **GitHub Pages:** copy `health-tracker/index.html` into its own repository and enable Pages on that repository.

## Files

```
health-tracker/
├── index.html   # the whole app: markup, styles, food database, recipes, workout library, logic
└── README.md    # this file
```
