# Fuel & Form

A personal health tracker. It's a single static page with no build step and no server, and it is separate from the rest of this repo.

- **My targets**: enter your sex, age, height, weight, goal (lose fat, maintain, build muscle) and activity level. It calculates your daily calories (Mifflin–St Jeor × activity, adjusted for your goal), protein, carbs, fat, fibre and water, plus BMI and roughly how long it will take to reach your goal weight.
- **Today**: type your meals in plain words, like `3 eggs, 2 roti, 1 bowl dal, 150g chicken, 500 ml water`. It recognises about 100 common foods (Indian and Western) and units like g, ml, cup, bowl, slice, tbsp and scoop. It totals everything against your targets and suggests what to eat next. You can save your own foods if one isn't recognised.
- **Workout plan**: a weekly plan based on your goal, training days (2–6), experience, and whether you train at a gym or at home. It includes sets, reps, rest times, cardio and how to progress.

Your data is saved in your browser's local storage on each device.

## Run it

Open `index.html` in a browser, or serve the folder:

```
npx serve health-tracker
```

To host it on its own (for example on Vercel, Netlify or GitHub Pages), point the site's root directory at `health-tracker/`.
