-- Seed UK trade categories

insert into public.trade_categories (name, slug, description, icon) values
  ('Plumber', 'plumber', 'General plumbing, pipe fitting, bathroom installation', '🔧'),
  ('Electrician', 'electrician', 'Electrical installations, rewiring, fault finding', '⚡'),
  ('Gas Engineer', 'gas-engineer', 'Boiler installation, servicing, gas safety checks', '🔥'),
  ('Carpenter', 'carpenter', 'Joinery, fitted furniture, door and window fitting', '🪚'),
  ('Roofer', 'roofer', 'Roof repairs, re-roofing, guttering, fascias', '🏠'),
  ('Plasterer', 'plasterer', 'Plastering, rendering, skimming, coving', '🧱'),
  ('Painter & Decorator', 'painter-decorator', 'Interior and exterior painting, wallpapering', '🎨'),
  ('Locksmith', 'locksmith', 'Lock fitting, emergency entry, security upgrades', '🔑'),
  ('Landscaper', 'landscaper', 'Garden design, fencing, decking, driveways', '🌿'),
  ('Builder', 'builder', 'Extensions, renovations, structural work', '🏗️'),
  ('Tiler', 'tiler', 'Wall and floor tiling, bathroom and kitchen tiling', '🔲'),
  ('Handyman', 'handyman', 'General repairs, odd jobs, flat-pack assembly', '🛠️'),
  ('Kitchen Fitter', 'kitchen-fitter', 'Kitchen design and installation', '🍳'),
  ('Bathroom Fitter', 'bathroom-fitter', 'Bathroom design, installation, wet rooms', '🚿'),
  ('Window Fitter', 'window-fitter', 'Double glazing, window and door installation', '🪟'),
  ('Heating Engineer', 'heating-engineer', 'Central heating, underfloor heating, radiators', '🌡️'),
  ('Damp Proofing', 'damp-proofing', 'Damp surveys, treatment, tanking', '💧'),
  ('Pest Control', 'pest-control', 'Rodent, insect, and bird control', '🐀'),
  ('Drainage Engineer', 'drainage-engineer', 'Blocked drains, CCTV surveys, drain repairs', '🕳️'),
  ('Scaffolder', 'scaffolder', 'Scaffolding erection and dismantling', '🪜')
on conflict (slug) do nothing;
