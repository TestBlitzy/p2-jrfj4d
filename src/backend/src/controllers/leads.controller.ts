/**
 * @fileoverview Lead Management Controller
 * @version 1.0.0
 * 
 * Implements comprehensive REST endpoints for lead management functionality
 * including creation, scoring, qualification, and retrieval with enhanced
 * security, performance optimization, and error handling.
 */

import {
    Controller,
    Post,
    Get,
    Put,
    Query,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    HttpStatus,
    HttpException,
    ValidationPipe,
    ParseUUIDPipe
} from '@nestjs/common';
import { RateLimit } from '@nestjs/throttler'; // ^5.0.0
import { CacheInterceptor, CacheTTL } from '@nestjs/common'; // ^10.0.0
import { Logger } from 'winston'; // ^3.8.0

import { LeadService } from '../services/leads.service';
import { AuthGuard } from '../guards/auth.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { 
    CreateLeadDto, 
    UpdateLeadDto, 
    LeadScoreDto, 
    LeadQualificationDto 
} from '../dto/leads.dto';
import { ILead } from '../interfaces/leads.interface';
import { LeadStatus } from '../constants/lead-status';

@Controller('leads')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class LeadsController {
    constructor(
        private readonly leadService: LeadService,
        private readonly logger: Logger
    ) {}

    /**
     * Creates a new lead with initial scoring and validation
     * @param createLeadDto - Lead creation data
     * @returns Promise<ILead> - Newly created lead
     */
    @Post()
    @RateLimit({ limit: 50, ttl: 60 })
    async createLead(@Body(new ValidationPipe()) createLeadDto: CreateLeadDto): Promise<ILead> {
        try {
            this.logger.info('Creating new lead', { email: createLeadDto.email });
            const lead = await this.leadService.createLead(createLeadDto);
            this.logger.info('Lead created successfully', { leadId: lead.id });
            return lead;
        } catch (error) {
            this.logger.error('Lead creation failed', { error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Retrieves a lead by ID with caching
     * @param id - Lead identifier
     * @returns Promise<ILead> - Lead data
     */
    @Get(':id')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(300) // 5 minutes cache
    async getLeadById(@Param('id', ParseUUIDPipe) id: string): Promise<ILead> {
        try {
            const lead = await this.leadService.getLeadById(id);
            if (!lead) {
                throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
            }
            return lead;
        } catch (error) {
            this.logger.error('Lead retrieval failed', { leadId: id, error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Updates lead score with validation and qualification triggers
     * @param id - Lead identifier
     * @param scoreDto - Lead score data
     * @returns Promise<ILead> - Updated lead
     */
    @Put(':id/score')
    @RateLimit({ limit: 100, ttl: 60 })
    async updateLeadScore(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ValidationPipe()) scoreDto: LeadScoreDto
    ): Promise<ILead> {
        try {
            if (id !== scoreDto.leadId) {
                throw new HttpException('Lead ID mismatch', HttpStatus.BAD_REQUEST);
            }
            return await this.leadService.updateLeadScore(
                id,
                scoreDto.score,
                scoreDto.factors
            );
        } catch (error) {
            this.logger.error('Lead score update failed', { leadId: id, error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Qualifies a lead based on comprehensive criteria
     * @param id - Lead identifier
     * @param qualificationDto - Qualification data
     * @returns Promise<LeadStatus> - Updated lead status
     */
    @Put(':id/qualify')
    @RateLimit({ limit: 50, ttl: 60 })
    async qualifyLead(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ValidationPipe()) qualificationDto: LeadQualificationDto
    ): Promise<LeadStatus> {
        try {
            if (id !== qualificationDto.leadId) {
                throw new HttpException('Lead ID mismatch', HttpStatus.BAD_REQUEST);
            }
            return await this.leadService.qualifyLead(id);
        } catch (error) {
            this.logger.error('Lead qualification failed', { leadId: id, error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Searches leads with filtering and pagination
     * @param query - Search parameters
     * @returns Promise<ILead[]> - Matching leads
     */
    @Get()
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(60) // 1 minute cache
    async searchLeads(
        @Query('status') status?: LeadStatus,
        @Query('minScore') minScore?: number,
        @Query('maxScore') maxScore?: number,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20
    ): Promise<{ leads: ILead[]; total: number }> {
        try {
            const searchParams = {
                status,
                scoreRange: minScore || maxScore ? { min: minScore, max: maxScore } : undefined,
                pagination: { page, limit }
            };

            return await this.leadService.searchLeads(searchParams);
        } catch (error) {
            this.logger.error('Lead search failed', { error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Updates lead data with validation
     * @param id - Lead identifier
     * @param updateLeadDto - Update data
     * @returns Promise<ILead> - Updated lead
     */
    @Put(':id')
    @RateLimit({ limit: 100, ttl: 60 })
    async updateLead(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(new ValidationPipe()) updateLeadDto: UpdateLeadDto
    ): Promise<ILead> {
        try {
            const lead = await this.leadService.updateLead(id, updateLeadDto);
            if (!lead) {
                throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
            }
            return lead;
        } catch (error) {
            this.logger.error('Lead update failed', { leadId: id, error: error.message });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}