Over the past few months, I've been building My Wardrobe, an AI-powered wardrobe management platform designed to help users organize their clothing, generate outfit recommendations, identify wardrobe gaps, and receive personalized styling advice.

What started as a simple wardrobe organizer quickly turned into a much larger engineering challenge. I didn't want recommendations to feel random, so I built a custom rule engine that combines Itten's Color Theory, the French 60/30/10 styling method, and Capsule Wardrobe Versatility Analysis to evaluate and rank outfit combinations.

The platform includes features such as AI-powered styling assistance, intelligent outfit generation, Wardrobe Gaps that identify the pieces most likely to expand a user's outfit options, and Smart Buy, which allows users to upload a clothing item and receive a recommendation based on how well it fits their existing wardrobe.

The application is built with React, TypeScript, Node.js, Express, Firebase, Cloudinary, and Groq AI. The frontend is hosted on Vercel, the backend runs on Render, and all AI requests are routed securely through the backend rather than exposed on the client.

One of the more interesting challenges was migrating the AI layer from Gemini to Groq while maintaining the existing user experience and architecture. Along the way, I also worked through authentication flows, database indexing, deployment issues, cloud integrations, and the many small problems that come with moving a project from prototype to production.

The platform is currently being used by 200+ users, and seeing real people interact with something I built from scratch has been one of the most rewarding parts of the experience.

Live Demo:
https://wardrobeproductionapp.vercel.app

