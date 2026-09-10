import Link from "next/link";

export function ErrorPage({
  code,
  codeClassName,
  title,
  message,
}: {
  code: string;
  codeClassName: string;
  title: string;
  message: string;
}) {
  return (
    <section className="mx-auto my-20 max-w-[620px] text-center">
      <div className={`text-[5rem] font-extrabold leading-none ${codeClassName}`}>{code}</div>
      <h1 className="mb-2 mt-4 text-navy">{title}</h1>
      <p className="text-muted">{message}</p>
      <Link href="/" className="btn btn-primary mt-4">
        Back home
      </Link>
    </section>
  );
}
