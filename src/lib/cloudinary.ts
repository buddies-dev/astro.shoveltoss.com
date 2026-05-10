type CldOpts = {
	w?: number;
	h?: number;
	q?: number | 'auto';
	c?: 'fill' | 'fit' | 'limit' | 'pad';
	ar?: string;
	format?: 'auto' | 'mp4' | 'webm' | 'jpg';
};

export function cld(url: string, opts: CldOpts = {}) {
	const { w, h, q = 'auto', c, ar, format = 'auto' } = opts;
	const params = [
		`f_${format}`,
		`q_${q}`,
		'dpr_auto',
		w && `w_${w}`,
		h && `h_${h}`,
		c && `c_${c}`,
		ar && `ar_${ar}`,
	].filter(Boolean).join(',');

	return url
		.replace('/image/upload/', `/image/upload/${params}/`)
		.replace('/video/upload/', `/video/upload/${params}/`);
}

export function srcset(url: string, widths: number[], opts: Omit<CldOpts, 'w'> = {}) {
	return widths.map((w) => `${cld(url, { ...opts, w })} ${w}w`).join(', ');
}
