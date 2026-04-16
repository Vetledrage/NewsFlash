import { signIn } from '@/app/(auth)/actions'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <LoginContent searchParams={searchParams} />
  )
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
        <h1 className="mb-2 text-2xl font-semibold text-white">Login</h1>
        <p className="mb-6 text-sm text-gray-400">
          Sign in to save and manage your articles.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {message}
          </div>
        )}

        <form action={signIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

