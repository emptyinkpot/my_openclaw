import { pgTable, serial, timestamp, index, unique, text, jsonb, boolean, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const mainLibraryEntries = pgTable("main_library_entries", {
	id: serial().primaryKey().notNull(),
	original: text().notNull(),
	replacements: jsonb().default([]).notNull(),
	category: text().default('通用').notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	isHidden: boolean("is_hidden").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_main_library_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_main_library_is_hidden").using("btree", table.isHidden.asc().nullsLast().op("bool_ops")),
	index("idx_main_library_is_system").using("btree", table.isSystem.asc().nullsLast().op("bool_ops")),
	index("idx_main_library_original").using("btree", table.original.asc().nullsLast().op("text_ops")),
	unique("main_library_entries_original_key").on(table.original),
]);

export const memes = pgTable("memes", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	category: text().default('其他').notNull(),
	tags: jsonb().default([]),
	note: text(),
	usageExample: text("usage_example"),
	isHidden: boolean("is_hidden").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_memes_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_memes_is_hidden").using("btree", table.isHidden.asc().nullsLast().op("bool_ops")),
	unique("memes_content_key").on(table.content),
]);

export const memeCategories = pgTable("meme_categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	usageScenario: text("usage_scenario"),
	examples: jsonb().default([]),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("meme_categories_name_key").on(table.name),
]);

export const literatureResources = pgTable("literature_resources", {
	id: serial().primaryKey().notNull(),
	type: text().default('content').notNull(),
	title: text().notNull(),
	content: text(),
	author: text(),
	preferredAuthors: jsonb("preferred_authors").default([]),
	tags: jsonb().default([]),
	priority: integer().default(1).notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_literature_priority").using("btree", table.priority.asc().nullsLast().op("int4_ops")),
	index("idx_literature_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const bannedWords = pgTable("banned_words", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	type: text().default('modern').notNull(),
	category: text().default('现代词汇').notNull(),
	reason: text(),
	alternative: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_banned_words_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("banned_words_content_key").on(table.content),
]);

export const deaiRules = pgTable("deai_rules", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	rules: text().notNull(),
	enabled: boolean().default(true).notNull(),
	order: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_deai_rules_enabled").using("btree", table.enabled.asc().nullsLast().op("bool_ops")),
]);
