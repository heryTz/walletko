ALTER TABLE "expense_allocations" ALTER COLUMN "amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "pot_allocations" ALTER COLUMN "amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE bigint;