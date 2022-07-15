import { type LoaderFunction, type ActionFunction } from '@remix-run/node';
import {
	useActionData as useRemixActionData,
	useLoaderData as useRemixLoaderData,
	useFormAction,
} from '@remix-run/react';
import { parse as baseParse } from '@conform-to/dom';
import { parse } from '@conform-to/zod';
import { type FormEventHandler, useState, useEffect } from 'react';
import { z } from 'zod';

const FormConfigSchema = z.object({
	initialReport: z.enum(['onSubmit', 'onBlur', 'onChange']).optional(),
	noValidate: z.preprocess(
		(data) => (typeof data !== 'undefined' ? Boolean(data) : data),
		z.boolean().optional(),
	),
	fallbackNative: z.preprocess(
		(data) => (typeof data !== 'undefined' ? Boolean(data) : data),
		z.boolean().optional(),
	),
});

function getFormConfig(searchParams: URLSearchParams) {
	const submission = parse(searchParams, FormConfigSchema);

	if (submission.state !== 'accepted') {
		throw new Response('Bad request', { status: 400 });
	}

	return submission.data;
}

export let loader: LoaderFunction = async ({ request }) => {
	const url = new URL(request.url);
	const config = getFormConfig(url.searchParams);

	return config;
};

export let action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const form = formData.get('playground');

	if (form) {
		formData.delete('playground');
	}

	return {
		form,
		entries: Array.from(formData),
	};
};

export function useActionData() {
	const config = useRemixLoaderData();
	const actionData = useRemixActionData();
	const action = useFormAction();
	const [formDataById, setFormDataById] = useState<
		Record<string, URLSearchParams | undefined>
	>(() => {
		if (actionData) {
			const { form, entries } = actionData;

			return {
				[form]: entries,
			};
		}

		return {};
	});
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(config)) {
		if (value) {
			searchParams.set(key, typeof value === 'string' ? value : '');
		}
	}

	const handleReset: FormEventHandler<HTMLFormElement> = (e) => {
		const form = e.currentTarget;

		setFormDataById((map) => ({
			...map,
			[form.id]: undefined,
		}));
	};

	useEffect(() => {
		if (!actionData) {
			return;
		}

		const { form, entries } = actionData;

		setFormDataById((map) => {
			if (map[form] === entries) {
				return map;
			}

			return {
				...map,
				[form]: entries,
			};
		});
	}, [actionData]);

	return {
		getSubmission(form: string, parse = baseParse) {
			const payload = formDataById[form];

			if (!payload) {
				return;
			}

			const formData = new URLSearchParams(payload);
			const submission = parse(formData);

			return submission;
		},
		config: {
			...actionData?.config,
			onReset: handleReset,
		},
		action: `${action}?${searchParams}`,
	};
}