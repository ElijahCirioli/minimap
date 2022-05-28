We use Heroku PostreSQL integration to host and access our database, and we use pgAdmin 4 as our client.

This folder is meant for little bits of documentation for us, and for data dumps.

Backup and restore notes:
Pgadmin / HerokuDB do not like PSQL command terminal, cannot access that, so plaintext dumps are out

To backup:
Use format custom
Put in the path that you want to become your dump, there’s no nice download functionality

To restore:
In options, select “clean” before restore
Load back in the custom dump

Restore / backup prompts accessed on top level accessible to us, like “df90c78”
