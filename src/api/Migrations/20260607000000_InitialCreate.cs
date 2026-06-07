using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MermaidNotes.Api.Migrations;

public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema(
            name: "entries");

        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

        migrationBuilder.CreateTable(
            name: "note_entries",
            schema: "entries",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                user_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                description_markdown = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                mermaid_source = table.Column<string>(type: "character varying(40000)", maxLength: 40000, nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                modified_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_note_entries", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_note_entries_user_id",
            schema: "entries",
            table: "note_entries",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "IX_note_entries_user_id_modified_at",
            schema: "entries",
            table: "note_entries",
            columns: ["user_id", "modified_at"]);

        migrationBuilder.Sql("""
            CREATE INDEX IF NOT EXISTS IX_note_entries_full_text
            ON entries.note_entries
            USING GIN (to_tsvector('english', coalesce(description_markdown, '') || ' ' || coalesce(mermaid_source, '')));
            """);

        migrationBuilder.Sql("""
            CREATE INDEX IF NOT EXISTS IX_note_entries_description_trgm
            ON entries.note_entries
            USING GIN (description_markdown gin_trgm_ops);
            """);

        migrationBuilder.Sql("""
            CREATE INDEX IF NOT EXISTS IX_note_entries_mermaid_trgm
            ON entries.note_entries
            USING GIN (mermaid_source gin_trgm_ops);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "note_entries",
            schema: "entries");
    }
}
