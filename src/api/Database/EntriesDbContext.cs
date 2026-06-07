using MermaidNotes.Api.Modules.Entries;
using Microsoft.EntityFrameworkCore;

namespace MermaidNotes.Api.Database;

public sealed class EntriesDbContext(DbContextOptions<EntriesDbContext> options) : DbContext(options)
{
    public const string SchemaName = "entries";

    public DbSet<Entry> Entries => Set<Entry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SchemaName);

        modelBuilder.Entity<Entry>(entry =>
        {
            entry.ToTable("note_entries");
            entry.HasKey(x => x.Id);

            entry.Property(x => x.Id)
                .ValueGeneratedNever();

            entry.Property(x => x.UserId)
                .HasColumnName("user_id")
                .HasMaxLength(256)
                .IsRequired();

            entry.Property(x => x.DescriptionMarkdown)
                .HasColumnName("description_markdown")
                .HasMaxLength(8_000)
                .IsRequired();

            entry.Property(x => x.MermaidSource)
                .HasColumnName("mermaid_source")
                .HasMaxLength(40_000)
                .IsRequired();

            entry.Property(x => x.CreatedAt)
                .HasColumnName("created_at");

            entry.Property(x => x.ModifiedAt)
                .HasColumnName("modified_at");

            entry.HasIndex(x => new { x.UserId, x.ModifiedAt });
            entry.HasIndex(x => x.UserId);
        });
    }
}
