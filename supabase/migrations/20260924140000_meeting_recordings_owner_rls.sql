-- Restrict meeting_recordings to their owner, matching the pattern used by
-- customers / calls / tasks / deals. The browser extension must now send an
-- authenticated user session (see wavelength-extension/supabase/client.js).

ALTER TABLE public.meeting_recordings
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meeting_recordings_owner_id_idx ON public.meeting_recordings(owner_id);

-- Remove the previous unrestricted policies.
DROP POLICY IF EXISTS "Allow select on meeting_recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Allow insert on meeting_recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Allow update on meeting_recordings" ON public.meeting_recordings;

-- Owner-scoped policies.
CREATE POLICY "Users can view own meeting recordings"
    ON public.meeting_recordings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own meeting recordings"
    ON public.meeting_recordings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own meeting recordings"
    ON public.meeting_recordings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own meeting recordings"
    ON public.meeting_recordings FOR DELETE USING (auth.uid() = owner_id);

-- Storage: writes now require an authenticated session; reads stay public so the
-- desktop client can play recordings via their public URL.
DROP POLICY IF EXISTS "Allow public upload on meeting-recordings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on meeting-recordings bucket" ON storage.objects;

CREATE POLICY "Authenticated upload on meeting-recordings bucket"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'meeting-recordings');
CREATE POLICY "Authenticated update on meeting-recordings bucket"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'meeting-recordings');
