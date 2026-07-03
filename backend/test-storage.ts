import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  'https://plyjtyiloxbbcefjdbwi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBseWp0eWlsb3hiYmNlZmpkYndpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4ODExOCwiZXhwIjoyMDk4NTY0MTE4fQ.T42u5-H6gGl8IxdI6uv9CT7nBFxZ5vCAMwUnXNRB8-s'
);

async function run() {
  const { data, error } = await supabase.storage.from('uploads').upload('test.txt', 'hello world', {
    contentType: 'text/plain',
    upsert: true
  });
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
