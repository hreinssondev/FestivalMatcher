-- Create direct_messages table for direct messaging without matches
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy for inserting messages (users can send messages to anyone)
CREATE POLICY "Users can send direct messages" ON direct_messages
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- Policy for viewing messages (users can see messages they sent or received)
CREATE POLICY "Users can view their direct messages" ON direct_messages
    FOR SELECT USING (
        auth.uid()::text = sender_id::text OR 
        auth.uid()::text = recipient_id::text
    );

-- Policy for updating messages (users can mark their received messages as read)
CREATE POLICY "Users can update their received messages" ON direct_messages
    FOR UPDATE USING (auth.uid()::text = recipient_id::text);

-- Policy for deleting messages (users can delete their own messages)
CREATE POLICY "Users can delete their own messages" ON direct_messages
    FOR DELETE USING (auth.uid()::text = sender_id::text);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_direct_messages_updated_at
    BEFORE UPDATE ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_direct_messages_updated_at();
