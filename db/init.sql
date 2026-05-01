-- Runs once on first boot of the postgres container (empty data volume).
-- Creates the test database alongside the default notes_dev database.
CREATE DATABASE notes_test;
