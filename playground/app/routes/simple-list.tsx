import { FormState, conform, useFieldList, useForm } from '@conform-to/react/experimental';
import { list } from '@conform-to/react';
import { parse } from '@conform-to/zod/experimental';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { Playground, Field, Alert } from '~/components';

const schema = z.object({
	items: z
		.string({ required_error: 'The field is required' })
		.regex(/^[^0-9]+$/, 'Number is not allowed')
		.array()
		.min(1, 'At least one item is required')
		.max(2, 'Maximum 2 items are allowed'),
});

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url);

	return {
		hasDefaultValue: url.searchParams.get('hasDefaultValue') === 'yes',
		noClientValidate: url.searchParams.get('noClientValidate') === 'yes',
	};
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData();
	const submission = parse(formData, { schema });

	return json(submission.report());
}

export default function SimpleList() {
	const { hasDefaultValue, noClientValidate } = useLoaderData<typeof loader>();
	const lastResult = useActionData();
	const form = useForm({
		lastResult,
		defaultValue: hasDefaultValue
			? { items: ['default item 0', 'default item 1'] }
			: undefined,
		onValidate: !noClientValidate
			? ({ formData }) => parse(formData, { schema })
			: undefined,
	});
	const items = useFieldList(form.fields.items);

	console.log({ items });

	return (
		<Form method="post" {...conform.form(form)}>
			<FormState formId={form.id} />
			<Playground title="Simple list" lastSubmission={lastResult}>
				<Alert errors={items.errors} />
				<ol>
					{items.list.map((item, index) => (
						<li key={item.key} className="border rounded-md p-4 mb-4">
							<Field label={`Item #${index + 1}`} config={item}>
								<input {...conform.input(item, { type: 'text' })} />
							</Field>
							<div className="flex flex-row gap-2">
								<button
									className="rounded-md border p-2 hover:border-black"
									{...list.remove(items.name, { index })}
								>
									Delete
								</button>
								<button
									className="rounded-md border p-2 hover:border-black"
									{...list.reorder(items.name, { from: index, to: 0 })}
								>
									Move to top
								</button>
								<button
									className="rounded-md border p-2 hover:border-black"
									{...list.replace(items.name, {
										index,
										defaultValue: '',
									})}
								>
									Clear
								</button>
							</div>
						</li>
					))}
				</ol>
				<div className="flex flex-row gap-2">
					<button
						className="rounded-md border p-2 hover:border-black"
						{...list.prepend(items.name, { defaultValue: '' })}
					>
						Insert top
					</button>
					<button
						className="rounded-md border p-2 hover:border-black"
						{...list.append(items.name, { defaultValue: '' })}
					>
						Insert bottom
					</button>
				</div>
			</Playground>
		</Form>
	);
}
