import { NextResponse } from 'next/server';
import type { BrandProject, StageName } from '@/lib/types';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({}); // uses GEMINI_API_KEY from env

export async function POST(request: Request) {
  try {
    const { stage, context }: { stage: StageName; context: Partial<BrandProject> } = await request.json();

    let data: any = {};
    
    if (stage === 'Understand') {
      const prompt = `You are an expert brand strategist. Your task is to diagnose and understand the user's raw brand idea.
Raw Idea: ${context.rawIdea}

${context.understanding?.qaPairs?.length ? `Previous Q&A:\n${context.understanding.qaPairs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}` : ''}

Analyze the information provided.
Return ONLY valid JSON matching the specified schema.
If there are material gaps in understanding the core problem, target user, or constraints, include up to 3 openQuestions. If the idea is clear enough to proceed, return an empty array for openQuestions.
Do NOT invent a name, tagline, or visual style yet - this stage is purely diagnostic.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              understanding: {
                type: Type.OBJECT,
                properties: {
                  targetUser: { type: Type.STRING, description: "The target user for the brand" },
                  coreProblem: { type: Type.STRING, description: "The core problem the brand solves" },
                  constraints: { type: Type.STRING, description: "Known constraints" },
                  openQuestions: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Max 3 questions. Only if something material is missing. Empty array if not."
                  }
                },
                required: ["targetUser", "coreProblem", "constraints", "openQuestions"]
              }
            },
            required: ["understanding"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else if (stage === 'Position') {
      const prompt = `You are an expert brand strategist. Your task is to define the brand positioning based on the user's raw idea and the diagnostic understanding.

Raw Idea: ${context.rawIdea}
Target User: ${context.understanding?.targetUser}
Core Problem: ${context.understanding?.coreProblem}
Constraints: ${context.understanding?.constraints}

Define the category, differentiator, a one-sentence value proposition, and the competitive angle.
Crucially, you must justify the differentiator in one sentence tied back to the targetUser and coreProblem - this is the reasoning trail judges want to see.
Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              positioning: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  differentiator: { type: Type.STRING },
                  differentiatorJustification: { type: Type.STRING, description: "One sentence justification tied back to targetUser and coreProblem" },
                  valueProp: { type: Type.STRING, description: "One-sentence value proposition" },
                  competitiveAngle: { type: Type.STRING }
                },
                required: ["category", "differentiator", "differentiatorJustification", "valueProp", "competitiveAngle"]
              }
            },
            required: ["positioning"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else if (stage === 'Shape') {
      const prompt = `You are an expert brand strategist. Your task is to define the brand personality, naming directions, a tagline, and a one-line pitch.
Use the following context:
Raw Idea: ${context.rawIdea}
Target User: ${context.understanding?.targetUser}
Core Problem: ${context.understanding?.coreProblem}
Category: ${context.positioning?.category}
Differentiator: ${context.positioning?.differentiator}
Value Prop: ${context.positioning?.valueProp}
Competitive Angle: ${context.positioning?.competitiveAngle}

Provide 3-5 brand personality traits with a one-line justification for each tied to the target audience.
Also provide 2-3 traits explicitly to avoid and why.
Then, provide 3 naming directions (not final names - directions/territories, e.g. "descriptive-literal", "abstract-evocative", "compound-invented"). For each direction, provide 2 example names and a rationale.
Finally, provide a tagline and a one-line pitch.
Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              personality: {
                type: Type.OBJECT,
                properties: {
                  traits: { 
                    type: Type.ARRAY, 
                    items: {
                      type: Type.OBJECT,
                      properties: { name: { type: Type.STRING }, justification: { type: Type.STRING } },
                      required: ["name", "justification"]
                    }
                  },
                  traitsToAvoid: { 
                    type: Type.ARRAY, 
                    items: {
                      type: Type.OBJECT,
                      properties: { name: { type: Type.STRING }, reason: { type: Type.STRING } },
                      required: ["name", "reason"]
                    }
                  }
                },
                required: ["traits", "traitsToAvoid"]
              },
              namingDirections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    direction: { type: Type.STRING },
                    exampleNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                    rationale: { type: Type.STRING }
                  },
                  required: ["direction", "exampleNames", "rationale"]
                }
              },
              tagline: { type: Type.STRING },
              onePitchLine: { type: Type.STRING }
            },
            required: ["personality", "namingDirections", "tagline", "onePitchLine"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else if (stage === 'Challenge') {
      const prompt = `You are a skeptical, highly experienced creative director. Your job is to brutally (but constructively) critique the brand identity generated so far.
Scan the following positioning, personality, naming direction, tagline, and pitch for:
1. Startup clichés
2. Generic language
3. Contradictions (e.g. traits vs naming direction mismatch)
4. Audience mismatch

Context:
Target User: ${context.understanding?.targetUser}
Core Problem: ${context.understanding?.coreProblem}
Category: ${context.positioning?.category}
Differentiator: ${context.positioning?.differentiator}
Value Prop: ${context.positioning?.valueProp}
Competitive Angle: ${context.positioning?.competitiveAngle}
Personality Traits: ${context.personality?.traits?.map(t => t.name).join(', ')}
Selected Naming Direction: ${context.selectedNamingDirection}
Tagline: ${context.tagline}
Pitch: ${context.onePitchLine}

For each issue found, provide:
- issue: What is wrong
- why: Why it is a problem
- betterAlternative: A specific, rewritten alternative to fix it
- fieldToPatch: Which exact field needs fixing. Choose ONLY from: 'tagline', 'onePitchLine', 'positioning.category', 'positioning.differentiator', 'positioning.valueProp', 'positioning.competitiveAngle', or 'none'.

If you find absolutely zero issues and the brand is perfect, return an empty array for challengeLog. Do NOT invent filler critique.
Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              challengeLog: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    issue: { type: Type.STRING },
                    why: { type: Type.STRING },
                    betterAlternative: { type: Type.STRING },
                    fieldToPatch: { 
                      type: Type.STRING,
                      enum: ['tagline', 'onePitchLine', 'positioning.category', 'positioning.differentiator', 'positioning.valueProp', 'positioning.competitiveAngle', 'none']
                    }
                  },
                  required: ["issue", "why", "betterAlternative", "fieldToPatch"]
                }
              }
            },
            required: ["challengeLog"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        data = {
          challengeLog: (parsed.challengeLog || []).map((log: any) => {
             let originalValue = '';
             if (log.fieldToPatch === 'tagline') originalValue = context.tagline || '';
             if (log.fieldToPatch === 'onePitchLine') originalValue = context.onePitchLine || '';
             if (log.fieldToPatch === 'positioning.category') originalValue = context.positioning?.category || '';
             if (log.fieldToPatch === 'positioning.differentiator') originalValue = context.positioning?.differentiator || '';
             if (log.fieldToPatch === 'positioning.valueProp') originalValue = context.positioning?.valueProp || '';
             if (log.fieldToPatch === 'positioning.competitiveAngle') originalValue = context.positioning?.competitiveAngle || '';
             
             return {
               ...log,
               id: Math.random().toString(36).substring(7),
               status: 'pending',
               originalValue
             };
          })
        };
      }
    } else if (stage === 'Visualize') {
      const prompt = `You are a world-class brand designer. Your job is to define the visual direction of the brand based on its strategy and personality.
Context:
Category: ${context.positioning?.category}
Value Prop: ${context.positioning?.valueProp}
Personality Traits: ${context.personality?.traits?.map(t => t.name).join(', ')}
Traits to Avoid: ${context.personality?.traitsToAvoid?.map(t => t.name).join(', ')}

Please provide:
1. typographyStyle: A descriptive string (e.g. "geometric sans, high x-height")
2. closestGoogleFont: A real, existing Google Font name that perfectly matches the typographyStyle (e.g. "Space Grotesk", "Outfit", "Lora", "Inter"). It MUST be a real Google Font.
3. colorMood: 3 to 5 colors. For each, provide a hex code (e.g. "#FF5733"), a name, and a rationale for why it fits the brand.
4. imageryStyle: A descriptive string of the photography or illustration style.
5. motifs: 2-4 symbolic motifs or icons to consider.
6. shapesToAvoid: 2-3 shapes or visual styles to explicitly avoid given the personality.

Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualDirection: {
                type: Type.OBJECT,
                properties: {
                  typographyStyle: { type: Type.STRING },
                  closestGoogleFont: { type: Type.STRING },
                  colorMood: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        hex: { type: Type.STRING },
                        name: { type: Type.STRING },
                        rationale: { type: Type.STRING }
                      },
                      required: ["hex", "name", "rationale"]
                    }
                  },
                  imageryStyle: { type: Type.STRING },
                  motifs: { type: Type.ARRAY, items: { type: Type.STRING } },
                  shapesToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["typographyStyle", "closestGoogleFont", "colorMood", "imageryStyle", "motifs", "shapesToAvoid"]
              }
            },
            required: ["visualDirection"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else if (stage === 'Consistency') {
      const prompt = `You are a meticulous brand director. Your job is to review all the brand decisions made so far to ensure they cohere into ONE unified brand.
This is a final consistency check. You should catch things that emerged from combining decisions across stages. Do NOT repeat previous localized critique. Look at the whole picture.

Context:
Positioning: ${JSON.stringify(context.positioning)}
Personality: ${JSON.stringify(context.personality)}
Selected Naming Direction: ${context.selectedNamingDirection}
Tagline: ${context.tagline}
Pitch: ${context.onePitchLine}
Visual Direction: ${JSON.stringify(context.visualDirection)}

Check whether the name, tagline, personality, voice, and visual direction all cohere.
Flag any remaining conflicts. For each conflict, identify which stage is the root cause ('Position', 'Shape', or 'Visualize') and describe the issue.
If there are no conflicts and everything is perfectly unified, return resolved: true and an empty array for conflicts.
If there are conflicts, return resolved: false.

Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              consistencyReport: {
                type: Type.OBJECT,
                properties: {
                  conflicts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stageName: { type: Type.STRING, enum: ['Position', 'Shape', 'Visualize'] },
                        issue: { type: Type.STRING }
                      },
                      required: ["stageName", "issue"]
                    }
                  },
                  resolved: { type: Type.BOOLEAN }
                },
                required: ["resolved"]
              }
            },
            required: ["consistencyReport"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else if (stage === 'Launch') {
      const prompt = `You are a world-class copywriter and brand marketer. Your job is to generate the final launch assets for this brand.
Write all copy strictly in the voice implied by the chosen personality traits. Demonstrate the traits in the writing—don't just state them.

Context:
Positioning: ${JSON.stringify(context.positioning)}
Personality: ${JSON.stringify(context.personality)}
Selected Naming Direction: ${context.selectedNamingDirection}
Tagline: ${context.tagline}
Pitch: ${context.onePitchLine}
Visual Direction: ${JSON.stringify(context.visualDirection)}

Provide:
1. landingPage: { headline, subhead }
2. brandPitch: { problem, solution, whyNow, personalityOneLiner }
3. socialPost: A short launch post for social media.

Return ONLY valid JSON matching the specified schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              launchAssets: {
                type: Type.OBJECT,
                properties: {
                  landingPage: {
                    type: Type.OBJECT,
                    properties: {
                      headline: { type: Type.STRING },
                      subhead: { type: Type.STRING }
                    },
                    required: ["headline", "subhead"]
                  },
                  brandPitch: {
                    type: Type.OBJECT,
                    properties: {
                      problem: { type: Type.STRING },
                      solution: { type: Type.STRING },
                      whyNow: { type: Type.STRING },
                      personalityOneLiner: { type: Type.STRING }
                    },
                    required: ["problem", "solution", "whyNow", "personalityOneLiner"]
                  },
                  socialPost: { type: Type.STRING }
                },
                required: ["landingPage", "brandPitch", "socialPost"]
              }
            },
            required: ["launchAssets"]
          }
        }
      });
      
      const text = response.text;
      if (text) {
        data = JSON.parse(text);
      }
    } else {
      switch (stage) {
        case 'Understand':
        case 'Position':
        case 'Shape':
        case 'Challenge':
        case 'Visualize':
        case 'Consistency':
        case 'Launch':
          break; // Handled above
      default:
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
