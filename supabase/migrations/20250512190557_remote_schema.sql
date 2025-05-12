revoke delete on table "public"."chunks" from "anon";

revoke insert on table "public"."chunks" from "anon";

revoke references on table "public"."chunks" from "anon";

revoke select on table "public"."chunks" from "anon";

revoke trigger on table "public"."chunks" from "anon";

revoke truncate on table "public"."chunks" from "anon";

revoke update on table "public"."chunks" from "anon";

revoke delete on table "public"."chunks" from "authenticated";

revoke insert on table "public"."chunks" from "authenticated";

revoke references on table "public"."chunks" from "authenticated";

revoke select on table "public"."chunks" from "authenticated";

revoke trigger on table "public"."chunks" from "authenticated";

revoke truncate on table "public"."chunks" from "authenticated";

revoke update on table "public"."chunks" from "authenticated";

revoke delete on table "public"."chunks" from "service_role";

revoke insert on table "public"."chunks" from "service_role";

revoke references on table "public"."chunks" from "service_role";

revoke select on table "public"."chunks" from "service_role";

revoke trigger on table "public"."chunks" from "service_role";

revoke truncate on table "public"."chunks" from "service_role";

revoke update on table "public"."chunks" from "service_role";

revoke delete on table "public"."documents" from "anon";

revoke insert on table "public"."documents" from "anon";

revoke references on table "public"."documents" from "anon";

revoke select on table "public"."documents" from "anon";

revoke trigger on table "public"."documents" from "anon";

revoke truncate on table "public"."documents" from "anon";

revoke update on table "public"."documents" from "anon";

revoke delete on table "public"."documents" from "authenticated";

revoke insert on table "public"."documents" from "authenticated";

revoke references on table "public"."documents" from "authenticated";

revoke select on table "public"."documents" from "authenticated";

revoke trigger on table "public"."documents" from "authenticated";

revoke truncate on table "public"."documents" from "authenticated";

revoke update on table "public"."documents" from "authenticated";

revoke delete on table "public"."documents" from "service_role";

revoke insert on table "public"."documents" from "service_role";

revoke references on table "public"."documents" from "service_role";

revoke select on table "public"."documents" from "service_role";

revoke trigger on table "public"."documents" from "service_role";

revoke truncate on table "public"."documents" from "service_role";

revoke update on table "public"."documents" from "service_role";

alter table "public"."chunks" drop constraint "chunks_document_id_fkey";

drop function if exists "public"."match_chunks"(query_embedding vector, match_count integer);

alter table "public"."chunks" drop constraint "chunks_pkey";

alter table "public"."documents" drop constraint "documents_pkey";

drop index if exists "public"."chunks_embedding_idx";

drop index if exists "public"."chunks_pkey";

drop index if exists "public"."documents_pkey";

drop table "public"."chunks";

drop table "public"."documents";

drop extension if exists "vector";


