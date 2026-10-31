import { Button } from '@repo/ui'
import { A, useNavigate } from '@solidjs/router'
import { onMount, type ParentProps, Show } from 'solid-js'
import { useSession } from '#entities/sessions'
import { createSignOut } from '#features/sign-out'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'

/**
 * The frame every app screen shares: a header with the brand, who is signed in (the way to the
 * account security) and the way to sign out, then the screen's title and content in one column,
 * mobile first. Focus moves to the title
 * when the screen opens; a failed sign-out shows below it.
 */
export function AppShell(props: ParentProps<{ title: string }>) {
  const { t } = useI18n()
  const user = useSession()
  const navigate = useNavigate()
  const signOut = createSignOut(() => navigate('/login', { replace: true }))

  return (
    <>
      <header class="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <A href="/" class="shrink-0 text-sm font-semibold tracking-tight">
          {t('app.name')}
        </A>
        <div class="flex min-w-0 items-center gap-3">
          <A
            href="/account"
            class="block min-w-0 truncate text-sm text-muted-foreground underline underline-offset-4 hover:decoration-2"
          >
            {t('appShell.signedInAs', { name: user.name })}
          </A>
          <Button variant="outline" size="sm" class="shrink-0" disabled={signOut.pending()} onClick={signOut.signOut}>
            {t('appShell.signOut')}
          </Button>
        </div>
      </header>
      <main class="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-4 pb-8 sm:px-6 sm:pt-8 sm:pb-12">
        <h1
          ref={(heading) => onMount(() => heading.focus())}
          tabIndex={-1}
          class="text-2xl font-semibold tracking-tight outline-none"
        >
          {props.title}
        </h1>
        <Show when={signOut.failure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
        {props.children}
      </main>
    </>
  )
}
