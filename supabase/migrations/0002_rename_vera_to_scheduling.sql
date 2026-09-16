update team_members
set
  slug = 'scheduling',
  display_name = 'Shared inbox',
  email = 'scheduling@matriarch-studios.com'
where slug = 'vera';

update team_members
set email = 'cofounder@matriarch-studios.com'
where slug = 'cofounder';
