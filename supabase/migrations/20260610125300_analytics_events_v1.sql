-- Create analytics_events table
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    app_slug TEXT NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own events
CREATE POLICY "Users can insert own analytics"
ON public.analytics_events
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- Policy 2: Platform managers (global admins) can view all events
CREATE POLICY "Admins can view all analytics events"
ON public.analytics_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    )
);

-- Create indexes for operational performance
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_app_slug ON public.analytics_events(app_slug);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
