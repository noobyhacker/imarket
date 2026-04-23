import { NextRequest, NextResponse } from 'next/server';
import { translateMessage } from '@/lib/translation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, targetLang } = body as { texts: string[]; targetLang: string };

    if (!Array.isArray(texts) || !targetLang) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (texts.length > 10) {
      return NextResponse.json({ error: 'Too many texts' }, { status: 400 });
    }

    const translations = await Promise.all(
      texts.map((text) => translateMessage(text, targetLang))
    );

    return NextResponse.json({ translations });
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
