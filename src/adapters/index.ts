import { forexFactory } from "./forexFactory";
import { newsWire } from "./newsWire";
import { stockMktNewz } from "./stockMktNewz";
import type { SourceAdapter } from "./types";
import { unusualWhales } from "./unusualWhales";

/** Add a new source by writing one adapter file and registering it here. */
export const ADAPTERS: SourceAdapter[] = [forexFactory, unusualWhales, stockMktNewz, newsWire];
