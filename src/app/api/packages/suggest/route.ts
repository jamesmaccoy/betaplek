import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { BASE_PACKAGE_TEMPLATES, getDefaultPackageTitle } from '@/lib/package-types'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
	try {
		const { description, postId, baseRate, hostContext } = await request.json()
		const text = String(description || '').trim()
		if (!text) {
			return NextResponse.json({ recommendations: [] })
		}

		const payload = await getPayload({ config: configPromise })

		// Authenticate and require host/admin if hostContext
		let user: any = null
		try {
			const authResult = await payload.auth({ headers: request.headers })
			user = authResult.user
		} catch {}

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		if (hostContext) {
			const role: string[] = Array.isArray(user.role) ? user.role : [user.role].filter(Boolean)
			const isHostOrAdmin = role.includes('host') || role.includes('admin')
			if (!isHostOrAdmin) {
				return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
			}
		}

		// Optionally load post details
		let postTitle = ''
		let postDescription = ''
		if (postId) {
			try {
				const post = await payload.findByID({ collection: 'posts', id: String(postId), depth: 1 })
				postTitle = post?.title || ''
				postDescription = post?.meta?.description || ''
			} catch (e) {}
		}

		const knownTemplates = BASE_PACKAGE_TEMPLATES.map(t => ({
			revenueCatId: t.revenueCatId,
			defaultName: getDefaultPackageTitle(t),
			category: t.category,
			durationTier: t.durationTier,
			minNights: t.minNights,
			maxNights: t.maxNights,
			customerTierRequired: t.customerTierRequired
		}))

		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
		const prompt = `You are helping a host choose booking packages from a fixed catalog.\n${hostContext ? 'The requester is a host or admin.' : ''}
${postTitle || postDescription || baseRate ? `\nPROPERTY CONTEXT:\n- Title: ${postTitle || 'N/A'}\n- Description: ${postDescription || 'N/A'}\n- Base rate: ${baseRate ? `R${baseRate}/night` : 'Unknown'}\n` : ''}
Here is the catalog of packages (id = revenueCatId):
${knownTemplates.map(t => `- ${t.revenueCatId}: ${t.defaultName} [${t.category}, ${t.durationTier}, ${t.minNights}-${t.maxNights} nights, requires ${t.customerTierRequired}]`).join('\n')}

User description: "${text}"

Return ONLY a compact JSON object with the shape:
{"ids": ["revenueCatId1", "revenueCatId2", ...]}

Rules:
- Choose 1-4 ids that best match the description and duration hints (e.g. hourly,daily, weekly, monthly, annual, 3 nights, 7 nights, 14 nights, 30 nights, Allunslusive, Studio hire,  hosted, luxury, add-on).
- Prefer 'pro' tier items only if the description implies hosted/concierge/luxury/experiences.
- If unclear, include a safe default like per-night standard and weekly standard.
- If description implies gatherings, events, team offsites, or monthly workspace use, consider 'gathering_monthly' where appropriate.
- Do not include text outside JSON.`

		const result = await model.generateContent(prompt)
		const raw = result.response.text()

		let ids: string[] = []
		try {
			const jsonStart = raw.indexOf('{')
			const jsonEnd = raw.lastIndexOf('}')
			const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : '{}'
			const parsed = JSON.parse(jsonStr)
			if (Array.isArray(parsed.ids)) ids = parsed.ids.map((s: any) => String(s))
		} catch {
			ids = []
		}

		// Filter to known templates and dedupe
		const knownIds = new Set(BASE_PACKAGE_TEMPLATES.map(t => t.revenueCatId))
		const picked = ids.filter((id) => knownIds.has(id))
		const defaults = ['per_night', 'Weekly']
		const finalIds = picked.length > 0 ? Array.from(new Set(picked)).slice(0, 4) : defaults.filter(id => knownIds.has(id))

		return NextResponse.json({ recommendations: finalIds })
	} catch (error) {
		console.error('Suggest API error:', error)
		return NextResponse.json({ recommendations: [] }, { status: 200 })
	}
} 