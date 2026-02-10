-- Create challenges table
create table if not exists challenges (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    status text not null,
    amount numeric,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert challenges
insert into challenges (name, status, amount) values
    ('SpiceProp #001', 'Failed', null),
    ('SpiceProp #002', 'Active', 50000),
    ('FundingPips #003', 'Active', 50000);
