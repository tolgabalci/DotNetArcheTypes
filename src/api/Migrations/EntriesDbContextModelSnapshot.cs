using System;
using MermaidNotes.Api.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace MermaidNotes.Api.Migrations;

[DbContext(typeof(EntriesDbContext))]
partial class EntriesDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("entries");

        modelBuilder.Entity("MermaidNotes.Api.Modules.Entries.Entry", b =>
        {
            b.Property<Guid>("Id")
                .ValueGeneratedNever()
                .HasColumnType("uuid");

            b.Property<DateTimeOffset>("CreatedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("created_at");

            b.Property<string>("DescriptionMarkdown")
                .IsRequired()
                .HasMaxLength(8000)
                .HasColumnType("character varying(8000)")
                .HasColumnName("description_markdown");

            b.Property<string>("MermaidSource")
                .IsRequired()
                .HasMaxLength(40000)
                .HasColumnType("character varying(40000)")
                .HasColumnName("mermaid_source");

            b.Property<DateTimeOffset>("ModifiedAt")
                .HasColumnType("timestamp with time zone")
                .HasColumnName("modified_at");

            b.Property<string>("UserId")
                .IsRequired()
                .HasMaxLength(256)
                .HasColumnType("character varying(256)")
                .HasColumnName("user_id");

            b.HasKey("Id");

            b.HasIndex("UserId");

            b.HasIndex("UserId", "ModifiedAt");

            b.ToTable("note_entries", "entries");
        });
    }
}
