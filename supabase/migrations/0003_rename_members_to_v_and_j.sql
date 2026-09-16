update team_members
set
  slug = 'v',
  display_name = 'V',
  email = 'v@matriarch-studios.com'
where slug in ('vera', 'scheduling');

update team_members
set
  slug = 'j',
  display_name = 'J',
  email = 'j@matriarch-studios.com'
where slug = 'cofounder';
